"use client";

import { useEntryLoading } from "@/utils/EntryLoadingContext";
import { type Writer, getWriter } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import type { Hex } from "viem";
import { NavDropdown } from "../NavDropdown";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { useComposeHeaderActions } from "../writer/ComposeHeaderActionsContext";
import { BackButton } from "./BackButton";

export function WriterHeader({
	address,
}: {
	address: string;
}) {
	const { authenticated } = usePrivy();
	const queryClient = useQueryClient();
	const { isEntryLoading } = useEntryLoading();
	const { actions } = useComposeHeaderActions();
	const pathname = usePathname();
	const router = useRouter();
	const isEntryPage = pathname.split("/").length > 3;
	const newEntryHref = `/writer/${address}/new`;

	useEffect(() => {
		if (!authenticated || isEntryPage) return;
		router.prefetch(newEntryHref);
		void import("../markdown/MDX");
	}, [authenticated, isEntryPage, newEntryHref, router]);

	const { data: writer } = useQuery<Writer>({
		queryKey: ["writer", address],
		queryFn: ({ signal }) => getWriter(address as Hex, signal),
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
					<div className="h-[39px] w-18 bg-surface dark:bg-surface-raised animate-pulse rounded-lg" />
				) : (
					<MarkdownRenderer
						markdown={writer.title}
						className="text-primary [&_.prose]:!text-primary [&_.prose_*]:!text-primary"
					/>
				)}
			</div>

			{actions ? (
				<div className="lg:hidden flex items-center gap-4">{actions}</div>
			) : authenticated && !isEntryPage ? (
				<Link
					href={newEntryHref}
					aria-label="Create entry"
					prefetch
					onTouchStart={() => {
						router.prefetch(newEntryHref);
						void import("../markdown/MDX");
					}}
					onPointerEnter={() => {
						router.prefetch(newEntryHref);
						void import("../markdown/MDX");
					}}
					className="lg:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
				>
					<FiPlus className="h-6 w-6" />
				</Link>
			) : null}
			<div className="hidden lg:block">
				<NavDropdown />
			</div>
		</div>
	);
}
