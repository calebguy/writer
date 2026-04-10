"use client";

import { type Entry, editEntry } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import { signUpdate } from "@/utils/signer";
import { compress, decompress, decrypt, encrypt } from "@/utils/utils";
import { useQueryClient } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import { useCallback, useState } from "react";
import type { Hex } from "viem";
import { LoadingRelic } from "./LoadingRelic";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";

export interface MigrateEntry {
	entry: Entry;
	writerAddress: string;
	writerTitle: string;
}

type MigrationStatus = "idle" | "migrating" | "done" | "error";

export function MigrateModal({
	open,
	onClose,
	entriesToMigrate,
}: {
	open: boolean;
	onClose: () => void;
	entriesToMigrate: MigrateEntry[];
}) {
	const [wallet] = useOPWallet();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<MigrationStatus>("idle");
	const [migratedCount, setMigratedCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [migratedIds, setMigratedIds] = useState<Set<number>>(new Set());

	const handleClose = useCallback(() => {
		setStatus("idle");
		setMigratedCount(0);
		setErrorMessage(null);
		setMigratedIds(new Set());
		onClose();
	}, [onClose]);

	const migrate = useCallback(async () => {
		if (!wallet || entriesToMigrate.length === 0) return;
		setStatus("migrating");
		setMigratedCount(0);
		setErrorMessage(null);

		try {
			// Pre-derive a v4 key per unique storage_id in the batch. v4 keys
			// are per-writer (the whole point of Option B for C-1), so a user
			// migrating entries from N writers signs N times. The keyCache
			// dedupes within a session.
			const v4KeysByStorageId = new Map<string, Uint8Array>();
			const uniqueStorageIds = new Set(
				entriesToMigrate.map(({ entry }) => entry.storageId.toLowerCase()),
			);
			for (const storageId of uniqueStorageIds) {
				v4KeysByStorageId.set(
					storageId,
					await getCachedDerivedKey(wallet, "v4", storageId),
				);
			}

			for (const { entry, writerAddress } of entriesToMigrate) {
				// Decrypt with old key. v3 is now also a migration source
				// because v3 derivation is phishable too (audit C-1).
				let decrypted: string;
				if (entry.raw?.startsWith("enc:v3:br:")) {
					const keyV3 = await getCachedDerivedKey(wallet, "v3");
					decrypted = await decrypt(keyV3, entry.raw.slice(10));
				} else if (entry.raw?.startsWith("enc:v2:br:")) {
					const keyV2 = await getCachedDerivedKey(wallet, "v2");
					decrypted = await decrypt(keyV2, entry.raw.slice(10));
				} else if (entry.raw?.startsWith("enc:br:")) {
					const keyV1 = await getCachedDerivedKey(wallet, "v1");
					decrypted = await decrypt(keyV1, entry.raw.slice(7));
				} else {
					continue;
				}

				// Decompress to get original markdown, then re-compress and
				// re-encrypt with the v4 key for this entry's writer.
				const keyV4 = v4KeysByStorageId.get(entry.storageId.toLowerCase());
				if (!keyV4) {
					throw new Error(
						`Missing v4 key for storage_id ${entry.storageId} (this should never happen)`,
					);
				}
				const markdown = await decompress(decrypted);
				const compressed = await compress(markdown);
				const encrypted = await encrypt(keyV4, compressed);
				const newContent = `enc:v4:br:${encrypted}`;

				const { signature, nonce, totalChunks, content } = await signUpdate(
					wallet,
					{
						entryId: Number(entry.onChainId),
						address: writerAddress as Hex,
						content: newContent,
					},
				);

				await editEntry({
					address: writerAddress,
					id: Number(entry.onChainId),
					signature,
					nonce,
					totalChunks,
					content,
				});

				setMigratedCount((c) => c + 1);
				setMigratedIds((prev) => new Set(prev).add(entry.id));
			}

			queryClient.invalidateQueries({ queryKey: ["writer"] });
			queryClient.invalidateQueries({ queryKey: ["get-writers"] });
			setStatus("done");
		} catch (error) {
			console.error("Migration failed", error);
			setErrorMessage(
				"Migration was interrupted. Already migrated entries are safe.",
			);
			setStatus("error");
		}
	}, [wallet, entriesToMigrate, queryClient]);

	// Group entries by writer for display
	const entriesByWriter = entriesToMigrate.reduce<
		Record<string, { title: string; entries: MigrateEntry[] }>
	>((acc, item) => {
		if (!acc[item.writerAddress]) {
			acc[item.writerAddress] = { title: item.writerTitle, entries: [] };
		}
		acc[item.writerAddress].entries.push(item);
		return acc;
	}, {});

	return (
		<Modal open={open} onClose={handleClose} className="max-w-md w-full">
			<VisuallyHidden.Root>
				<ModalTitle>Migrate Private Entries</ModalTitle>
				<ModalDescription>
					Re-encrypt private entries with the new signing key
				</ModalDescription>
			</VisuallyHidden.Root>

			<div className="space-y-4">
				<span className="text-2xl">Migrate Private Entries</span>
				<div className="text-sm text-neutral-500 dark:text-neutral-400">
					You have {entriesToMigrate.length} private entries that currently use
					old signing keys. You will always have read access to these entries,
					but we recommend migrating them to the new signing key for improved
					security.
				</div>

				{/* Entry list */}
				<div className="max-h-48 overflow-y-auto space-y-3">
					{Object.entries(entriesByWriter).map(
						([writerAddress, { title, entries }]) => (
							<div key={writerAddress}>
								<p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
									{title}
								</p>
								<div className="space-y-1">
									{entries.map(({ entry }) => {
										const isMigrated = migratedIds.has(entry.id);
										const version = entry.raw?.startsWith("enc:v3:br:")
											? "v3"
											: entry.raw?.startsWith("enc:v2:br:")
												? "v2"
												: "v1";
										return (
											<div
												key={entry.id}
												className={`flex items-center justify-between text-xs font-mono ${
													isMigrated
														? "text-green-600 dark:text-green-400 line-through"
														: "text-neutral-600 dark:text-neutral-400"
												}`}
											>
												<span className="truncate mr-2">
													entry #{entry.onChainId}
												</span>
												<span className="shrink-0">
													{isMigrated ? "v4" : version}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						),
					)}
				</div>

				{status === "idle" && (
					<button
						type="button"
						className="w-full p-2 text-sm border border-transparent hover:border-dashed bg-surface dark:border-neutral-600 hover:border-primary hover:text-primary cursor-pointer transition-colors"
						onClick={migrate}
					>
						Migrate {entriesToMigrate.length}{" "}
						{entriesToMigrate.length === 1 ? "entry" : "entries"}
					</button>
				)}

				{status === "migrating" && (
					<div className="flex items-center justify-center gap-2 py-4">
						<LoadingRelic size={20} />
						<span className="text-sm text-neutral-500">
							Migrating {migratedCount}/{entriesToMigrate.length}...
						</span>
					</div>
				)}

				{status === "done" && (
					<p className="text-sm text-green-600 dark:text-green-400 text-center py-4">
						Migrated {migratedCount} {migratedCount === 1 ? "entry" : "entries"}{" "}
						successfully.
					</p>
				)}

				{status === "error" && errorMessage && (
					<div className="space-y-3">
						<p className="text-sm text-red-600 dark:text-red-400 text-center py-2">
							{errorMessage}
						</p>
						<button
							type="button"
							className="w-full p-2 text-sm border border-dashed border-neutral-400 dark:border-neutral-600 hover:border-primary hover:text-primary cursor-pointer transition-colors"
							onClick={migrate}
						>
							Retry
						</button>
					</div>
				)}
			</div>
		</Modal>
	);
}
