"use client";

import { Check } from "@/components/icons/Check";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { useComposeHeaderActions } from "@/components/writer/ComposeHeaderActionsContext";
import {
	type Entry,
	type Writer,
	editEntry,
	getEntry,
	getWriter,
} from "@/utils/api";
import { cn } from "@/utils/cn";
import {
	clearPrivateCachedEntry,
	clearPublicCachedEntry,
	getPrivateCachedEntry,
	getPublicCachedEntry,
} from "@/utils/entryCache";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import { signUpdate } from "@/utils/signer";
import {
	compress,
	encrypt,
	isEntryPrivate,
	isWalletAuthor,
	processPrivateEntry,
} from "@/utils/utils";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Hex } from "viem";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

async function hydrateEditableEntry(
	entry: Entry,
	wallet: ReturnType<typeof useOPWallet>[0],
) {
	if (!isEntryPrivate(entry) || entry.decompressed) return entry;
	if (!wallet || !isWalletAuthor(wallet, entry)) return entry;

	const keyV5 =
		entry.raw?.startsWith("enc:v5:br:") && entry.storageId
			? await getCachedDerivedKey(wallet, "v5", entry.storageId)
			: undefined;
	const keyV4 =
		entry.raw?.startsWith("enc:v4:br:") && entry.storageId
			? await getCachedDerivedKey(wallet, "v4", entry.storageId)
			: undefined;
	const keyV3 = entry.raw?.startsWith("enc:v3:br:")
		? await getCachedDerivedKey(wallet, "v3")
		: undefined;
	const keyV2 = entry.raw?.startsWith("enc:v2:br:")
		? await getCachedDerivedKey(wallet, "v2")
		: undefined;
	const keyV1 = entry.raw?.startsWith("enc:br:")
		? await getCachedDerivedKey(wallet, "v1")
		: undefined;

	return processPrivateEntry(keyV2, entry, keyV1, keyV3, keyV4, keyV5);
}

export function MobileEditEntryPage({
	address,
	id,
}: {
	address: string;
	id: string;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [wallet, walletReady] = useOPWallet();
	const editorRef = useRef<MDXEditorMethods>(null);
	const { getAccessToken } = usePrivy();
	const { setActions } = useComposeHeaderActions();
	const [markdown, setMarkdown] = useState("");
	const [encrypted, setEncrypted] = useState(false);
	const [isSigning, setIsSigning] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [initialMarkdown, setInitialMarkdown] = useState("");
	const [entry, setEntry] = useState<Entry | null>(null);
	const entryId = Number(id);
	const isExternalWallet = !!wallet && wallet.walletClientType !== "privy";

	const writerQueryKey = ["writer", address] as const;
	const entryQueryKey = ["entry", address, id] as const;

	const { data: fetchedEntry } = useQuery<Entry>({
		queryKey: entryQueryKey,
		queryFn: ({ signal }) => getEntry(address as Hex, entryId, signal),
	});
	const { data: writer } = useQuery<Writer>({
		queryKey: writerQueryKey,
		queryFn: ({ signal }) => getWriter(address as Hex, signal),
	});

	useEffect(() => {
		let cancelled = false;
		async function loadEntry() {
			let source = fetchedEntry;
			if (!source) {
				const publicCached = await getPublicCachedEntry(address, id);
				source = publicCached ?? undefined;
				if (!source && wallet?.address) {
					source =
						getPrivateCachedEntry(wallet.address, address, id) ?? undefined;
				}
			}
			if (!source) return;
			if (isEntryPrivate(source) && !source.decompressed && !walletReady)
				return;

			try {
				const hydrated = await hydrateEditableEntry(source, wallet);
				if (cancelled) return;
				setEntry(hydrated);
				const content = hydrated.decompressed ?? "";
				setMarkdown(content);
				editorRef.current?.setMarkdown(content);
				setInitialMarkdown(content);
				setEncrypted(isEntryPrivate(hydrated));
			} catch (err) {
				console.error("Could not prepare entry for editing", err);
			}
		}
		loadEntry();
		return () => {
			cancelled = true;
		};
	}, [address, id, fetchedEntry, wallet, walletReady]);

	const { mutate } = useMutation({
		mutationFn: editEntry,
		mutationKey: ["edit-entry", address, id],
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey: writerQueryKey });
			await queryClient.cancelQueries({ queryKey: entryQueryKey });
			const previousWriter = queryClient.getQueryData<Writer>(writerQueryKey);
			const previousEntry = queryClient.getQueryData<Entry>(entryQueryKey);
			const now = new Date().toISOString();
			const applyEntryPatch = (current: Entry): Entry => ({
				...current,
				raw: vars.content,
				decompressed: vars.decompressed ?? current.decompressed,
				updatedAt: now,
				updatedAtTransactionId: "pending",
				updatedAtHash: null,
				chunks:
					current.chunks.length > 0
						? current.chunks.map((chunk, idx) =>
								idx === 0 ? { ...chunk, content: vars.content } : chunk,
							)
						: [
								{
									id: -Date.now(),
									entryId: current.id,
									index: 0,
									content: vars.content,
									createdAt: now,
									createdAtTransactionId: null,
								},
							],
				version: vars.content.startsWith("enc:v5:br:")
					? "enc:v5:br:"
					: vars.content.startsWith("enc:v4:br:")
						? "enc:v4:br:"
						: "br:",
			});

			if (previousWriter) {
				queryClient.setQueryData<Writer>(writerQueryKey, (current) =>
					current
						? {
								...current,
								entries: current.entries.map((item) =>
									item.onChainId != null && item.onChainId.toString() === id
										? applyEntryPatch(item)
										: item,
								),
							}
						: current,
				);
			}
			if (previousEntry) {
				queryClient.setQueryData<Entry>(
					entryQueryKey,
					applyEntryPatch(previousEntry),
				);
			}
			return { previousWriter, previousEntry };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previousWriter) {
				queryClient.setQueryData(writerQueryKey, ctx.previousWriter);
			}
			if (ctx?.previousEntry) {
				queryClient.setQueryData(entryQueryKey, ctx.previousEntry);
			}
		},
		onSuccess: async () => {
			await clearPublicCachedEntry(address, id);
			if (wallet?.address) {
				clearPrivateCachedEntry(wallet.address, address, id);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: entryQueryKey });
			queryClient.invalidateQueries({ queryKey: writerQueryKey });
		},
	});

	const canSave = useMemo(() => {
		if (!entry || !wallet || !isWalletAuthor(wallet, entry)) return false;
		return markdown !== initialMarkdown || encrypted !== isEntryPrivate(entry);
	}, [entry, wallet, markdown, initialMarkdown, encrypted]);

	const handleExit = () => {
		if (canSave && !window.confirm("Discard these edits?")) return;
		router.push(`/writer/${address}/${id}`);
	};

	const handleSave = async () => {
		if (!entry || !wallet || !writer || !canSave || isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (isExternalWallet) setIsSigning(true);
			const compressedContent = await compress(markdown);
			let versionedCompressedContent = `br:${compressedContent}`;
			if (encrypted) {
				const key = await getCachedDerivedKey(wallet, "v5", entry.storageId);
				const encryptedContent = await encrypt(key, compressedContent);
				versionedCompressedContent = `enc:v5:br:${encryptedContent}`;
			}

			const { signature, nonce, entryId, totalChunks, content } =
				await signUpdate(wallet, {
					entryId: Number(id),
					address: address as Hex,
					content: versionedCompressedContent,
					legacyDomain: writer.legacyDomain,
				});
			const authToken = await getAccessToken();
			if (!authToken) {
				throw new Error("No auth token found");
			}

			mutate(
				{
					address: address as Hex,
					id: entryId,
					signature,
					nonce,
					totalChunks,
					content,
					authToken,
					decompressed: markdown,
				},
				{
					onError: (err) => {
						console.error("Edit entry failed:", err);
					},
				},
			);
			router.push(`/writer/${address}/${id}`);
		} catch (err) {
			console.error("Edit entry failed:", err);
			setIsSubmitting(false);
		} finally {
			if (isExternalWallet) setIsSigning(false);
		}
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				handleExit();
			}
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				void handleSave();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [
		canSave,
		isSubmitting,
		markdown,
		encrypted,
		entry,
		writer,
		wallet?.address,
	]);

	useEffect(() => {
		setActions(
			<>
				<button
					type="button"
					aria-label={encrypted ? "Make public" : "Make private"}
					onClick={() => setEncrypted(!encrypted)}
					disabled={!entry || isSubmitting}
					className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{encrypted ? (
						<Lock className="h-4 w-4" />
					) : (
						<Unlock className="h-4 w-4" />
					)}
				</button>
				<button
					type="button"
					aria-label="Save Entry"
					onClick={() => void handleSave()}
					disabled={!canSave || isSubmitting}
					className={cn(
						"text-primary hover:text-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
					)}
				>
					{isSigning ? (
						<span className="font-mono text-sm">sign</span>
					) : (
						<Check className="w-7 h-7" />
					)}
				</button>
			</>,
		);
		return () => setActions(null);
	}, [canSave, encrypted, entry, isSigning, isSubmitting, setActions]);

	if (entry && wallet && !isWalletAuthor(wallet, entry)) {
		return (
			<div className="grow flex items-center justify-center text-neutral-400 dark:text-neutral-600">
				Private
			</div>
		);
	}

	return (
		<div className="grow flex flex-col min-h-0">
			<div className="grow min-h-0 flex flex-col">
				<MDX
					ref={editorRef}
					markdown={markdown}
					autoFocus
					aspectSquare={false}
					placeholder="Edit Entry"
					onChange={setMarkdown}
					className="bg-transparent text-black dark:text-white h-full flex w-full p-0! create-input-mdx"
				/>
			</div>
		</div>
	);
}
