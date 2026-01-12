"use client";

import { Lock } from "@/components/icons/Lock";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { Entry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { isEntryPrivate } from "@/utils/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useMemo } from "react";

interface EntryListProps {
	processedEntries: Entry[];
	writerAddress: string;
}

export default function EntryList({
	processedEntries,
	writerAddress,
}: EntryListProps) {
	const queryClient = useQueryClient();

	// Sort entries by date (newest first)
	const sortedEntries = useMemo(() => {
		return [...processedEntries].sort((a, b) => {
			const dateA = new Date(a.createdAtBlockDatetime ?? a.createdAt).getTime();
			const dateB = new Date(b.createdAtBlockDatetime ?? b.createdAt).getTime();
			return dateB - dateA; // Reverse chronological (newest first)
		});
	}, [processedEntries]);

	// Pre-populate React Query cache on hover for instant entry page loads
	const prefetchEntry = useCallback(
		(entry: Entry) => {
			const entryId = entry.onChainId?.toString() ?? entry.id.toString();
			// Set the entry directly in React Query cache (already processed)
			queryClient.setQueryData(["entry", writerAddress, entryId], entry);
		},
		[queryClient, writerAddress],
	);

	return (
		<>
			{sortedEntries.map((entry) => {
				const dateFmt = "MMM do, yyyy";
				const createdAt = entry.createdAtBlockDatetime
					? format(new Date(entry.createdAtBlockDatetime), dateFmt)
					: format(new Date(entry.createdAt), dateFmt);

				return (
					<Link
						href={
							entry.onChainId
								? `/writer/${writerAddress}/${entry.onChainId.toString()}`
								: `/writer/${writerAddress}/pending/${entry.id}`
						}
						key={entry.id}
						className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 hover:cursor-zoom-in overflow-hidden"
						onMouseEnter={() => prefetchEntry(entry)}
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
