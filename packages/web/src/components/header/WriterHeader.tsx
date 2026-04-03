"use client";

import { useEntryLoading } from "@/utils/EntryLoadingContext";
import { type Writer, getWriter } from "@/utils/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiPlus } from "react-icons/fi";
import type { Hex } from "viem";
import { LogoDropdown } from "../LogoDropdown";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { useCreateEntryDrawer } from "../writer/CreateEntryDrawerContext";
import { BackButton } from "./BackButton";

export function WriterHeader({
	address,
}: {
	address: string;
}) {
	const queryClient = useQueryClient();
	const { isEntryLoading } = useEntryLoading();
	const { open } = useCreateEntryDrawer();

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
					<div className="h-[39px] w-18 bg-neutral-200 dark:bg-neutral-700 header-title-skeleton animate-pulse rounded-lg" />
				) : (
					<MarkdownRenderer markdown={writer.title} className="text-primary" />
				)}
			</div>

			<button
				type="button"
				aria-label="Create entry"
				onClick={open}
				className="md:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
			>
				<FiPlus className="h-6 w-6" />
			</button>
			<div className="hidden md:block">
				<LogoDropdown />
			</div>
		</div>
	);
}
