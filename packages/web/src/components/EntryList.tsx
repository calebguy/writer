"use client";

import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { Entry } from "@/utils/api";
import { cn } from "@/utils/cn";
import { isEntryPrivate } from "@/utils/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface EntryListProps {
	processedEntries: Entry[];
	writerAddress: string;
	showLockedEntries?: boolean;
	isUnlocking?: boolean;
	unlockError?: string | null;
	onUnlock?: () => void;
}

export default function EntryList({
	processedEntries,
	writerAddress,
	showLockedEntries = false,
	isUnlocking = false,
	unlockError,
	onUnlock,
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
				// Show skeleton for private entries that haven't been decrypted yet
				if (isEntryPrivate(entry) && !entry.decompressed) {
					if (!showLockedEntries) {
						return <EntryCardSkeleton key={entry.id} />;
					}
					const dateFmt = "MMM do, yyyy";
					const createdAt = entry.createdAtBlockDatetime
						? format(new Date(entry.createdAtBlockDatetime), dateFmt)
						: format(new Date(entry.createdAt), dateFmt);
					const isClickable = Boolean(onUnlock) && !isUnlocking;
					const Wrapper = isClickable ? "button" : "div";
					return (
						<Wrapper
							key={entry.id}
							type={isClickable ? "button" : undefined}
							onClick={isClickable ? onUnlock : undefined}
							disabled={isClickable ? isUnlocking : undefined}
							className={cn(
								"group relative aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden transition-colors private-entry-card",
								isClickable && "cursor-pointer hover:text-primary",
							)}
						>
							<div className="flex flex-col items-center justify-center grow text-neutral-600 gap-2 private-entry-content">
								{isUnlocking ? (
									<Unlock className="h-4 w-4 text-primary" />
								) : (
									<>
										<span className="block group-hover:hidden">
											<Lock className="h-4 w-4 text-neutral-600 private-entry-icon" />
										</span>
										<span className="hidden group-hover:block">
											<Unlock className="h-4 w-4 text-primary" />
										</span>
									</>
								)}
								<span className="text-sm">Private entry</span>
								<span className="text-xs">
									{isUnlocking ? "Unlocking..." : "Unlock to view"}
								</span>
								{unlockError && (
									<span className="text-[10px] text-red-500">
										Signature rejected
									</span>
								)}
							</div>
							<div className="writer-card-meta private-entry-meta text-neutral-600 flex items-end text-sm leading-3 pt-2 shrink-0 pb-2 justify-end">
								<span>{createdAt}</span>
							</div>
						</Wrapper>
					);
				}

				const dateFmt = "MMM do, yyyy";
				const createdAt = entry.createdAtBlockDatetime
					? format(new Date(entry.createdAtBlockDatetime), dateFmt)
					: format(new Date(entry.createdAt), dateFmt);

				const isPending = !entry.onChainId;

				return (
					<Link
						href={
							isPending
								? "#"
								: `/writer/${writerAddress}/${entry.onChainId?.toString()}`
						}
						key={entry.id}
						className={cn(
							"relative aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden",
							isPending ? "cursor-loading" : "hover:cursor-zoom-in",
						)}
						onClick={isPending ? (e) => e.preventDefault() : undefined}
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
								"writer-card-meta text-neutral-600 flex items-end text-sm leading-3 pt-2 shrink-0 pb-2",
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
							{isPending ? (
								<span className="pending-entry-spinner">
									<span className="pending-entry-spinner-track" />
									<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
								</span>
							) : (
								<span>{createdAt}</span>
							)}
						</div>
					</Link>
				);
			})}
		</>
	);
}
