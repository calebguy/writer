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
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Hex } from "viem";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const SAVED_SKELETON_KEYS = [
	"saved-0",
	"saved-1",
	"saved-2",
	"saved-3",
	"saved-4",
	"saved-5",
];

type MixedSavedItem =
	| {
			kind: "writer";
			key: string;
			savedAt: string | Date;
			writer: SavedWriter["writer"];
			entryCount: number;
	  }
	| {
			kind: "entry";
			key: string;
			savedAt: string | Date;
			entry: SavedEntry["entry"];
			writer: SavedEntry["writer"];
	  };

export default function SavedView({ userAddress }: { userAddress: Hex }) {
	const { data, isLoading } = useQuery({
		queryKey: ["saved", userAddress.toLowerCase()],
		queryFn: () => getSaved(userAddress),
	});

	const savedWriters = data?.writers ?? [];
	const savedEntries = data?.entries ?? [];
	const mixedItems = useMemo<MixedSavedItem[]>(() => {
		const writerItems = savedWriters.map((item) => ({
			kind: "writer" as const,
			key: `writer-${item.writer.address}-${item.savedAt}`,
			savedAt: item.savedAt,
			writer: item.writer,
			entryCount: item.entryCount,
		}));
		const entryItems = savedEntries.map((item) => ({
			kind: "entry" as const,
			key: `entry-${item.entry.id}-${item.savedAt}`,
			savedAt: item.savedAt,
			entry: item.entry,
			writer: item.writer,
		}));
		return [...writerItems, ...entryItems].sort(
			(a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
		);
	}, [savedWriters, savedEntries]);

	if (isLoading) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				{SAVED_SKELETON_KEYS.map((key, i) =>
					i % 2 === 0 ? (
						<WriterCardSkeleton key={key} />
					) : (
						<EntryCardSkeleton key={key} />
					),
				)}
			</div>
		);
	}

	if (mixedItems.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-500">
				Nothing saved yet
			</div>
		);
	}

	return <MixedSavedGrid entries={savedEntries} items={mixedItems} />;
}

function MixedSavedGrid({
	entries,
	items,
}: {
	entries: SavedEntry[];
	items: MixedSavedItem[];
}) {
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
			{items.map((item) => {
				if (item.kind === "writer") {
					const isPendingWriter = !item.writer.createdAtHash;
					return (
						<Link
							href={isPendingWriter ? "#" : `/writer/${item.writer.address}`}
							key={item.key}
							className={cn(
								"aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5",
								isPendingWriter ? "cursor-loading" : "hover:cursor-zoom-in",
							)}
							onClick={isPendingWriter ? (e) => e.preventDefault() : undefined}
						>
							<MarkdownRenderer
								markdown={item.writer.title}
								className="text-white writer-title"
							/>
							<div className="writer-card-meta text-neutral-600 flex items-end justify-between text-sm leading-3 pt-2 shrink-0 pb-2">
								<span>Writer</span>
								{isPendingWriter ? (
									<span className="pending-entry-spinner">
										<span className="pending-entry-spinner-track" />
										<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
									</span>
								) : (
									<span className="flex items-end gap-1">
										<Unlock className="w-3 h-3 mb-[2px]" />
										{item.entryCount}
									</span>
								)}
							</div>
						</Link>
					);
				}

				const entry = processedEntries[item.entry.id] ?? item.entry;
				const isPending = !entry.onChainId;
				const href = isPending
					? "#"
					: `/writer/${item.writer.address}/${entry.onChainId?.toString()}`;
				const isPrivate = isEntryPrivate(entry);
				const canUnlock = Boolean(wallet && isWalletAuthor(wallet, entry));
				const showLockedState = isPrivate && !entry.decompressed;
				const isUnlocking = allowDecryption && canUnlock;

				if (showLockedState && isUnlocking) {
					return <EntryCardSkeleton key={item.key} />;
				}

				return (
					<Link
						href={href}
						key={item.key}
						className={cn(
							"group relative aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden",
							showLockedState
								? canUnlock
									? "cursor-pointer"
									: "cursor-default"
								: isPending
									? "cursor-loading"
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
								<>
									<span className="block group-hover:hidden">
										<Lock className="h-4 w-4 text-neutral-600" />
									</span>
									<span className="hidden group-hover:block">
										<Unlock className="h-4 w-4 text-primary" />
									</span>
								</>
								<span className="text-sm">Private entry</span>
								<span className="text-xs">
									{canUnlock ? "Unlock to view" : "Private"}
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
						<div
							className={cn(
								"writer-card-meta text-neutral-600 flex items-end text-sm leading-3 pt-2 shrink-0 pb-2",
								isPending ? "justify-between" : "justify-start",
							)}
						>
							<span>{item.writer.title}</span>
							{isPending && (
								<span className="pending-entry-spinner">
									<span className="pending-entry-spinner-track" />
									<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
								</span>
							)}
						</div>
					</Link>
				);
			})}
		</div>
	);
}
