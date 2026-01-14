"use client";

import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import PublicEntryList from "@/components/PublicEntryList";
import { getPublicEntries } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";

const LOADING_SKELETON_AMOUNT = 12;

export default function ExplorePage() {
	const { data: entries, isLoading } = useQuery({
		queryKey: ["public-entries"],
		queryFn: () => getPublicEntries(),
	});

	if (isLoading || !entries) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				{Array.from({ length: LOADING_SKELETON_AMOUNT }).map((_, i) => (
					<EntryCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-500">
				No public entries yet
			</div>
		);
	}

	return <PublicEntryList entries={entries} />;
}
