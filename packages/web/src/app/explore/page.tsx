"use client";

import PublicWriterList from "@/components/PublicWriterList";
import { WriterCardSkeleton } from "@/components/WriterCardSkeleton";
import { GRID_SKELETON_COUNT } from "@/utils/constants";
import { getPublicWriters } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

const LOADING_SKELETON_KEYS = Array.from(
	{ length: GRID_SKELETON_COUNT },
	(_, i) => `explore-writer-skeleton-${i}`,
);

export default function ExplorePage() {
	useEffect(() => {
		const href = `${window.location.origin}/explore.md`;
		const selector = 'link[data-writer-markdown-alternate="explore"]';
		let link = document.head.querySelector<HTMLLinkElement>(selector);
		if (!link) {
			link = document.createElement("link");
			link.rel = "alternate";
			link.type = "text/markdown";
			link.dataset.writerMarkdownAlternate = "explore";
			document.head.appendChild(link);
		}
		link.href = href;

		return () => {
			link?.remove();
		};
	}, []);
	const { data: writers, isLoading } = useQuery({
		queryKey: ["public-writers"],
		queryFn: () => getPublicWriters(),
	});

	if (isLoading || !writers) {
		return (
			<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
				{LOADING_SKELETON_KEYS.map((key) => (
					<WriterCardSkeleton key={key} />
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
