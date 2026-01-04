"use client";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Lock } from "@/components/icons/Lock";
import type { Entry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { getDerivedSigningKey } from "@/utils/signer";
import { isEntryPrivate, isWalletAuthor, processEntry } from "@/utils/utils";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
const MDX = dynamic(() => import("@/components/markdown/MDX"), { ssr: false });

function EntryCardSkeleton() {
	return (
		<div className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden animate-pulse">
			<div className="flex-grow min-h-0 space-y-2 pt-1">
				<div className="h-4 bg-neutral-800 rounded w-3/4" />
				<div className="h-4 bg-neutral-800 rounded w-full" />
				<div className="h-4 bg-neutral-800 rounded w-5/6" />
				<div className="h-4 bg-neutral-800 rounded w-2/3" />
			</div>
			<div className="flex items-end justify-between text-sm leading-3 pt-2 flex-shrink-0 pb-2">
				<div className="h-3.5 w-3.5 bg-neutral-800 rounded" />
				<div className="h-3 bg-neutral-800 rounded w-20" />
			</div>
		</div>
	);
}

interface EntryListProps {
	entries: Entry[];
	writerAddress: string;
}

export default function EntryList({ entries, writerAddress }: EntryListProps) {
	const wallet = useOPWallet();
	const [processedEntriesMap, setProcessedEntriesMap] = useState<
		Map<number, Entry>
	>(new Map());
	// Track private entries confirmed not to belong to current user
	const [excludedEntryIds, setExcludedEntryIds] = useState<Set<number>>(
		new Set(),
	);

	useEffect(() => {
		async function processAllEntries() {
			const processed = new Map<number, Entry>();
			const excluded = new Set<number>();

			for (const entry of entries) {
				if (isEntryPrivate(entry)) {
					if (wallet && isWalletAuthor(wallet, entry)) {
						// Decrypt if it's the author's private entry
						const key = await getDerivedSigningKey(wallet);
						const decryptedEntry = await processEntry(key, entry);
						processed.set(entry.id, decryptedEntry);
					} else if (wallet) {
						// Private entry but not ours - exclude it
						excluded.add(entry.id);
					}
					// If no wallet yet, don't exclude - keep showing skeleton
				} else {
					// Public entries are always shown
					processed.set(entry.id, entry);
				}
			}

			setProcessedEntriesMap(processed);
			setExcludedEntryIds(excluded);
		}

		processAllEntries();
	}, [entries, wallet]);

	return (
		<>
			{entries.map((entry) => {
				// Skip entries confirmed not to belong to user
				if (excludedEntryIds.has(entry.id)) {
					return null;
				}

				const processedEntry = processedEntriesMap.get(entry.id);

				// Show skeleton if not yet processed
				if (!processedEntry) {
					return <EntryCardSkeleton key={entry.id} />;
				}
				const dateFmt = "MMM do, yyyy";
				let createdAt: string | undefined = undefined;
				if (processedEntry.createdAtBlockDatetime) {
					createdAt = format(
						new Date(processedEntry.createdAtBlockDatetime),
						dateFmt,
					);
				} else {
					createdAt = format(new Date(processedEntry.createdAt), dateFmt);
				}

				return (
					<Link
						href={`/writer/${writerAddress}/${processedEntry.onChainId?.toString()}`}
						key={processedEntry.id}
						className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 hover:cursor-zoom-in overflow-hidden"
					>
						<div className="overflow-y-scroll flex-grow min-h-0">
							<MarkdownRenderer
								markdown={processedEntry.decompressed ?? processedEntry.raw}
								className="text-white"
							/>
						</div>
						<div
							className={cn(
								"flex items-end text-neutral-600 text-sm leading-3 pt-2 flex-shrink-0 pb-2",
								{
									"justify-between": isEntryPrivate(processedEntry),
									"justify-end": !isEntryPrivate(processedEntry),
								},
							)}
						>
							{isEntryPrivate(processedEntry) && (
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
