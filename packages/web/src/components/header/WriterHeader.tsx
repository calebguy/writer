"use client";

import { useEntryLoading } from "@/utils/EntryLoadingContext";
import { useUpdateWriterTitle } from "@/hooks/useUpdateWriterTitle";
import { type Writer, getWriter } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { MdModeEdit } from "react-icons/md";
import type { Hex } from "viem";
import { NavDropdown } from "../NavDropdown";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { WriterTitleEditModal } from "../WriterTitleEditModal";
import { useComposeHeaderActions } from "../writer/ComposeHeaderActionsContext";
import { BackButton } from "./BackButton";

export function WriterHeader({
	address,
}: {
	address: string;
}) {
	const { authenticated, user } = usePrivy();
	const queryClient = useQueryClient();
	const { isEntryLoading } = useEntryLoading();
	const { actions } = useComposeHeaderActions();
	const pathname = usePathname();
	const router = useRouter();
	const isEntryPage = pathname.split("/").length > 3;
	const newEntryHref = `/writer/${address}/new`;
	const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
	const { mutateAsync: updateWriterTitle, isSigning: isUpdatingWriterTitle } =
		useUpdateWriterTitle();

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
	const canEditTitle =
		!!writer &&
		!!user?.wallet?.address &&
		writer.admin.toLowerCase() === user.wallet.address.toLowerCase();
	const handleTitleSave = async (title: string) => {
		if (!writer) return;
		const nextTitle = title.trim();
		if (!nextTitle || nextTitle === writer.title) {
			setIsTitleModalOpen(false);
			return;
		}
		await updateWriterTitle({ writer, title: nextTitle });
		setIsTitleModalOpen(false);
	};

	return (
		<>
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
					<div className="lg:hidden flex items-center gap-4 text-primary">
						{canEditTitle && (
							<button
								type="button"
								aria-label="Edit Place title"
								onClick={() => setIsTitleModalOpen(true)}
								className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
							>
								<MdModeEdit className="h-6 w-6" />
							</button>
						)}
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
							className="text-primary hover:opacity-80 transition-opacity cursor-pointer"
						>
							<FiPlus className="h-6 w-6" />
						</Link>
					</div>
				) : null}
				<div className="hidden lg:block">
					<NavDropdown />
				</div>
			</div>
			{writer && (
				<WriterTitleEditModal
					open={isTitleModalOpen}
					initialTitle={writer.title}
					isSaving={isUpdatingWriterTitle}
					onClose={() => setIsTitleModalOpen(false)}
					onSave={handleTitleSave}
				/>
			)}
		</>
	);
}
