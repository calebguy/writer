"use client";

import WriterContent from "@/components/WriterContent";
import { type Writer, getWriter } from "@/utils/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { use } from "react";
import type { Hex } from "viem";

export default function WriterPage({
	params,
}: {
	params: Promise<{ address: string }>;
}) {
	const { address } = use(params);
	const queryClient = useQueryClient();

	const { data: writer } = useQuery({
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

	if (!writer) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				<div className="aspect-square bg-neutral-900 animate-pulse" />
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className="aspect-square bg-neutral-900 animate-pulse"
						style={{ animationDelay: `${i * 50}ms` }}
					/>
				))}
			</div>
		);
	}

	return (
		<WriterContent
			writerTitle={writer.title}
			writerAddress={writer.address}
			entries={writer.entries}
		/>
	);
}
