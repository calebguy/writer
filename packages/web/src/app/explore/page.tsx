"use client";

import PublicWriterList from "@/components/PublicWriterList";
import { WriterCardSkeleton } from "@/components/WriterCardSkeleton";
import { getPublicWriters } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";

const LOADING_SKELETON_AMOUNT = 6;

export default function ExplorePage() {
	const { data: writers, isLoading } = useQuery({
		queryKey: ["public-writers"],
		queryFn: () => getPublicWriters(),
	});

	if (isLoading || !writers) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				{Array.from({ length: LOADING_SKELETON_AMOUNT }).map((_, i) => (
					<WriterCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		);
	}

	if (writers.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-500">
				No public writers yet
			</div>
		);
	}

	return <PublicWriterList writers={writers} />;
}
