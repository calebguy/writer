"use client";

import CreateInput from "@/components/CreateInput";
import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import EntryListWithCreateInput from "@/components/EntryListWithCreateInput";
import { type Writer, getWriter } from "@/utils/api";
import { useProcessedEntries } from "@/utils/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Hex } from "viem";

const LOADING_SKELETON_AMOUNT = 6;

export default function WriterPage() {
	const { address } = useParams<{ address: string }>();
	const queryClient = useQueryClient();

	const { data: writer, isLoading } = useQuery({
		queryKey: ["writer", address],
		queryFn: () => getWriter(address as Hex),
		placeholderData: () => {
			// Look through all manager query caches to find this writer
			const queries = queryClient.getQueriesData<Writer[]>({
				queryKey: ["get-writers"],
			});
			for (const [, writers] of queries) {
				const cached = writers?.find(
					(w) => w.address.toLowerCase() === address.toLowerCase(),
				);
				if (cached) return cached;
			}
			return undefined;
		},
	});

	// Process entries as soon as they arrive - shows immediately, processes private entries in background
	const { processedEntries } = useProcessedEntries(writer?.entries, address);

	// Show loading state during the gap where entries exist but processedEntries hasn't been populated yet
	const isEntriesProcessing = writer?.entries?.length && processedEntries.length === 0;
	if (!writer || isLoading || isEntriesProcessing) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				<div className="relative">
					<CreateInput onSubmit={() => {}} isLoading={false} />
					<div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center" />
				</div>
				{Array.from({ length: LOADING_SKELETON_AMOUNT }).map((_, i) => (
					<EntryCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		);
	}

	return (
		<EntryListWithCreateInput
			writerTitle={writer.title}
			writerAddress={writer.address}
			processedEntries={processedEntries}
		/>
	);
}
