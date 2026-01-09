"use client";

import { Lock } from "@/components/icons/Lock";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { Entry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { setCachedEntry } from "@/utils/entryCache";
import { useOPWallet } from "@/utils/hooks";
import { getDerivedSigningKey } from "@/utils/signer";
import { isEntryPrivate, isWalletAuthor, processEntry } from "@/utils/utils";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";

function EntryCardSkeleton() {
	return (
		<div className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden animate-pulse">
			<div className="flex-grow min-h-0 space-y-2 pt-1">
				<div className="h-4 bg-neutral-700 rounded w-3/4" />
				<div className="h-4 bg-neutral-700 rounded w-full" />
				<div className="h-4 bg-neutral-700 rounded w-5/6" />
				<div className="h-4 bg-neutral-700 rounded w-2/3" />
			</div>
			<div className="flex items-end justify-between text-sm leading-3 pt-2 flex-shrink-0 pb-2">
				<div className="h-3.5 w-3.5 bg-neutral-700 rounded" />
				<div className="h-3 bg-neutral-700 rounded w-20" />
			</div>
		</div>
	);
}

interface EntryListProps {
	entries: Entry[];
	writerAddress: string;
}

export default function EntryList({ entries, writerAddress }: EntryListProps) {
	const [wallet, ready] = useOPWallet();
	const [processedEntriesMap, setProcessedEntriesMap] = useState<
		Map<number, Entry>
	>(new Map());
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		async function processAllEntries() {
			const processed = new Map<number, Entry>();

			for (const entry of entries) {
				if (isEntryPrivate(entry)) {
					if (wallet && isWalletAuthor(wallet, entry)) {
						// Decrypt if it's the author's private entry
						const key = await getDerivedSigningKey(wallet);
						const decryptedEntry = await processEntry(key, entry);
						processed.set(entry.id, decryptedEntry);
					}
				} else {
					// Public entries are always shown
					processed.set(entry.id, entry);
				}
			}

			return processed;
		}

		if (!ready) {
			return;
		}

		processAllEntries().then((processed) => {
			setProcessedEntriesMap(processed);
			setIsProcessing(false);

			// Cache each processed entry for instant navigation
			for (const [, entry] of processed) {
				const entryId = entry.onChainId?.toString() ?? entry.id.toString();
				setCachedEntry(writerAddress, entryId, entry);
			}
		});
	}, [entries, wallet, ready, writerAddress]);

	return (
		<>
			{isProcessing &&
				Array.from({ length: entries.length }).map((_, idx) => (
					<EntryCardSkeleton key={`skeleton-${idx}`} />
				))}
			{!isProcessing &&
				processedEntriesMap.size > 0 &&
				Array.from(processedEntriesMap.values()).map((entry) => {
					const dateFmt = "MMM do, yyyy";
					let createdAt: string | undefined = undefined;
					if (entry.createdAtBlockDatetime) {
						createdAt = format(new Date(entry.createdAtBlockDatetime), dateFmt);
					} else {
						createdAt = format(new Date(entry.createdAt), dateFmt);
					}

					return (
						<Link
							href={
								entry.onChainId
									? `/writer/${writerAddress}/${entry.onChainId.toString()}`
									: `/writer/${writerAddress}/pending/${entry.id}`
							}
							key={entry.id}
							className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 hover:cursor-zoom-in overflow-hidden"
						>
							<div className="overflow-y-scroll grow min-h-0">
								<MarkdownRenderer
									markdown={entry.decompressed ?? entry.raw}
									className="text-white"
									links={false}
								/>
							</div>
							<div
								className={cn(
									"flex items-end text-neutral-600 text-sm leading-3 pt-2 shrink-0 pb-2",
									{
										"justify-between": isEntryPrivate(entry),
										"justify-end": !isEntryPrivate(entry),
									},
								)}
							>
								{isEntryPrivate(entry) && (
									<span>
										<Lock className="h-3.5 w-3.5 text-neutral-600" />
									</span>
								)}
								<span>{createdAt}</span>
							</div>
						</Link>
					);
				})}
		</>
	);
}
