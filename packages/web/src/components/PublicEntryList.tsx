"use client";

import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { PublicEntry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";

interface PublicEntryListProps {
	entries: PublicEntry[];
}

export default function PublicEntryList({ entries }: PublicEntryListProps) {
	// Sort entries by date (newest first)
	const sortedEntries = useMemo(() => {
		return [...entries].sort((a, b) => {
			const dateA = new Date(a.createdAtBlockDatetime ?? a.createdAt).getTime();
			const dateB = new Date(b.createdAtBlockDatetime ?? b.createdAt).getTime();
			return dateB - dateA;
		});
	}, [entries]);

	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{sortedEntries.map((entry) => {
				const dateFmt = "MMM do, yyyy";
				const createdAt = entry.createdAtBlockDatetime
					? format(new Date(entry.createdAtBlockDatetime), dateFmt)
					: format(new Date(entry.createdAt), dateFmt);

				const writerAddress = entry.writer?.address;
				const writerTitle = entry.writer?.title;

				return (
					<Link
						href={
							writerAddress && entry.onChainId
								? `/writer/${writerAddress}/${entry.onChainId}`
								: "#"
						}
						key={entry.id}
						className={cn(
							"aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden",
							writerAddress && entry.onChainId
								? "hover:cursor-zoom-in"
								: "cursor-not-allowed",
						)}
					>
						<div className="overflow-y-scroll grow min-h-0">
							<MarkdownRenderer
								markdown={entry.decompressed ?? entry.raw}
								className="text-white"
								links={false}
							/>
						</div>
						<div className="flex items-end justify-between text-neutral-600 text-sm leading-3 pt-2 shrink-0 pb-2">
							{writerTitle && (
								<span className="truncate max-w-[60%]" title={writerTitle}>
									{writerTitle}
								</span>
							)}
							<span>{createdAt}</span>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
