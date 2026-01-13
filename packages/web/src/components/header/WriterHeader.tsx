"use client";

import { type Writer, getWriter } from "@/utils/api";
import { useEntryLoading } from "@/utils/EntryLoadingContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { LogoDropdown } from "../LogoDropdown";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { BackButton } from "./BackButton";

export function WriterHeader({
	address,
}: {
	address: string;
}) {
	const queryClient = useQueryClient();
	const { isEntryLoading } = useEntryLoading();

	const { data: writer } = useQuery({
		queryKey: ["writer", address],
		queryFn: () => getWriter(address as Hex),
		// Use cached data from writers list if available
		placeholderData: () => {
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

	// Show skeleton if writer data not loaded OR if entry page is still loading
	const showSkeleton = !writer?.title || isEntryLoading;

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2 text-primary">
				<BackButton writerAddress={address} />
				{showSkeleton ? (
					<div className="h-[39px] w-18 bg-neutral-700 animate-pulse rounded-lg" />
				) : (
					<MarkdownRenderer markdown={writer.title} className="text-primary" />
				)}
			</div>

			<LogoDropdown />
		</div>
	);
}
