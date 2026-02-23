"use client";

import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import { WriterCardSkeleton } from "@/components/WriterCardSkeleton";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { type SavedEntry, type SavedWriter, getSaved } from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey, hasCachedDerivedKey } from "@/utils/keyCache";
import {
	isEntryPrivate,
	isWalletAuthor,
	processPrivateEntry,
} from "@/utils/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const SAVED_WRITER_SKELETON_KEYS = [
	"saved-writer-0",
	"saved-writer-1",
	"saved-writer-2",
];
const SAVED_ENTRY_SKELETON_KEYS = [
	"saved-entry-0",
	"saved-entry-1",
	"saved-entry-2",
];

export default function SavedView({ userAddress }: { userAddress: Hex }) {
	const { data, isLoading } = useQuery({
		queryKey: ["saved", userAddress.toLowerCase()],
		queryFn: () => getSaved(userAddress),
	});

	const savedWriters = data?.writers ?? [];
	const savedEntries = data?.entries ?? [];

	const sortedWriters = useMemo(
		() =>
			[...savedWriters].sort(
				(a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
			),
		[savedWriters],
	);
	const sortedEntries = useMemo(
		() =>
			[...savedEntries].sort(
				(a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
			),
		[savedEntries],
	);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					{SAVED_WRITER_SKELETON_KEYS.map((key) => (
						<WriterCardSkeleton key={key} />
					))}
				</div>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					{SAVED_ENTRY_SKELETON_KEYS.map((key) => (
						<EntryCardSkeleton key={key} />
					))}
				</div>
			</div>
		);
	}

	if (sortedWriters.length === 0 && sortedEntries.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-500">
				Nothing saved yet
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{sortedWriters.length > 0 && (
				<section className="flex flex-col gap-2">
					<div className="text-primary text-sm uppercase tracking-wide">
						Saved Writers
					</div>
					<SavedWriterGrid writers={sortedWriters} />
				</section>
			)}
			{sortedEntries.length > 0 && (
				<section className="flex flex-col gap-2">
					<div className="text-primary text-sm uppercase tracking-wide">
						Saved Entries
					</div>
					<SavedEntryGrid entries={sortedEntries} />
				</section>
			)}
		</div>
	);
}

function SavedWriterGrid({ writers }: { writers: SavedWriter[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{writers.map((item) => (
				<Link
					href={`/writer/${item.writer.address}`}
					key={`${item.writer.address}-${item.savedAt}`}
					className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 hover:cursor-zoom-in"
				>
					<MarkdownRenderer
						markdown={item.writer.title}
						className="text-white writer-title"
					/>
					<div className="writer-card-meta text-right text-sm text-neutral-600 leading-3 pt-2">
						Saved {format(new Date(item.savedAt), "MMM do, yyyy")}
					</div>
				</Link>
			))}
		</div>
	);
}

function SavedEntryGrid({ entries }: { entries: SavedEntry[] }) {
	const [wallet] = useOPWallet();
	const [allowDecryption, setAllowDecryption] = useState(false);
	const [unlockError, setUnlockError] = useState<string | null>(null);
	const [processedEntries, setProcessedEntries] = useState<
		Record<number, SavedEntry["entry"]>
	>({});

	useEffect(() => {
		setProcessedEntries(
			Object.fromEntries(entries.map((item) => [item.entry.id, item.entry])),
		);
	}, [entries]);

	useEffect(() => {
		if (!wallet) return;
		if (
			hasCachedDerivedKey(wallet, "v2") ||
			hasCachedDerivedKey(wallet, "v1")
		) {
			setAllowDecryption(true);
		}
	}, [wallet]);

	useEffect(() => {
		const connectedWallet = wallet;
		if (!connectedWallet || !allowDecryption) return;

		let cancelled = false;
		async function decryptEntries() {
			const activeWallet = connectedWallet;
			if (!activeWallet) return;

			try {
				const needs = entries
					.map((item) => item.entry)
					.filter(
						(entry) =>
							isEntryPrivate(entry) &&
							!entry.decompressed &&
							isWalletAuthor(activeWallet, entry),
						);
				if (needs.length === 0) return;

				const needsV2 = needs.some((entry) =>
					entry.raw?.startsWith("enc:v2:br:"),
				);
				const needsV1 = needs.some((entry) => entry.raw?.startsWith("enc:br:"));
					const keyV2 = needsV2
						? await getCachedDerivedKey(activeWallet, "v2")
						: undefined;
					const keyV1 = needsV1
						? await getCachedDerivedKey(activeWallet, "v1")
						: undefined;
				const updates = await Promise.all(
					needs.map(
						async (entry) =>
							[
								entry.id,
								await processPrivateEntry(keyV2, entry, keyV1),
							] as const,
					),
				);

				if (cancelled) return;
				setProcessedEntries((prev) => ({
					...prev,
					...Object.fromEntries(updates),
				}));
				setUnlockError(null);
			} catch (error) {
				console.error("Failed to decrypt saved entries", error);
				if (!cancelled) {
					setUnlockError("Signature request was rejected.");
					setAllowDecryption(false);
				}
			}
		}

		decryptEntries();
		return () => {
			cancelled = true;
		};
	}, [entries, wallet, allowDecryption]);

	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{entries.map((item) => {
				const entry = processedEntries[item.entry.id] ?? item.entry;
				const isPending = !entry.onChainId;
				const href = isPending
					? "#"
					: `/writer/${item.writer.address}/${entry.onChainId?.toString()}`;
				const isPrivate = isEntryPrivate(entry);
				const canUnlock = Boolean(wallet && isWalletAuthor(wallet, entry));
				const showLockedState = isPrivate && !entry.decompressed;
				const isUnlocking = allowDecryption && canUnlock;

				return (
					<Link
						href={href}
						key={`${entry.id}-${item.savedAt}`}
						className={cn(
							"aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden",
							showLockedState
								? canUnlock
									? "cursor-pointer"
									: "cursor-default"
								: "hover:cursor-zoom-in",
						)}
						onClick={(e) => {
							if (showLockedState) {
								e.preventDefault();
								if (canUnlock && !isUnlocking) {
									setUnlockError(null);
									setAllowDecryption(true);
								}
								return;
							}
							if (isPending) {
								e.preventDefault();
							}
						}}
					>
						{showLockedState ? (
							<div className="flex flex-col items-center justify-center grow text-neutral-600 gap-2">
								{isUnlocking ? (
									<Unlock className="h-4 w-4 text-primary" />
								) : (
									<Lock className="h-4 w-4 text-neutral-600" />
								)}
								<span className="text-sm">Private entry</span>
								<span className="text-xs">
									{canUnlock
										? isUnlocking
											? "Unlocking..."
											: "Unlock to view"
										: "Private"}
								</span>
								{unlockError && canUnlock && (
									<span className="text-[10px] text-red-500">
										Signature rejected
									</span>
								)}
							</div>
						) : (
							<div className="overflow-y-scroll grow min-h-0">
								<MarkdownRenderer
									markdown={entry.decompressed ?? entry.raw}
									className="text-white"
									links={false}
								/>
							</div>
						)}
						<div className="writer-card-meta text-neutral-600 flex items-end justify-between text-sm leading-3 pt-2 shrink-0 pb-2">
							<span>{item.writer.title}</span>
							<span>{format(new Date(item.savedAt), "MMM do")}</span>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
