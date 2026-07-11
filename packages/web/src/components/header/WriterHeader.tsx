"use client";

import { hiddenWritersQueryKey } from "@/hooks/useHiddenWriters";
import { useUpdateWriterTitle } from "@/hooks/useUpdateWriterTitle";
import { useEntryLoading } from "@/utils/EntryLoadingContext";
import {
	type Writer,
	type WriterSummary,
	getWriter,
	hideWriter as hideWriterApi,
} from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { MdModeEdit } from "react-icons/md";
import type { Hex } from "viem";
import { NavDropdown } from "../NavDropdown";
import { WriterTitleEditModal } from "../WriterTitleEditModal";
import { Modal, ModalTitle } from "../dsl/Modal";
import { Check } from "../icons/Check";
import { Close } from "../icons/Close";
import { ClosedEye } from "../icons/ClosedEye";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { useComposeHeaderActions } from "../writer/ComposeHeaderActionsContext";
import { BackButton } from "./BackButton";

export function WriterHeader({
	address,
}: {
	address: string;
}) {
	const { authenticated, user, getAccessToken } = usePrivy();
	const queryClient = useQueryClient();
	const { isEntryLoading } = useEntryLoading();
	const { actions } = useComposeHeaderActions();
	const pathname = usePathname();
	const router = useRouter();
	const isEntryPage = pathname.split("/").length > 3;
	const newEntryHref = `/writer/${address}/new`;
	const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
	const [isHideModalOpen, setIsHideModalOpen] = useState(false);
	const { mutateAsync: updateWriterTitle, isSigning: isUpdatingWriterTitle } =
		useUpdateWriterTitle();
	const userAddress = user?.wallet?.address;

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
		!!userAddress &&
		writer.admin.toLowerCase() === userAddress.toLowerCase();
	const canHideWriter =
		!isEntryPage &&
		!!writer &&
		!!userAddress &&
		(writer.admin.toLowerCase() === userAddress.toLowerCase() ||
			writer.managers.some(
				(manager) => manager.toLowerCase() === userAddress.toLowerCase(),
			));
	const { mutate: hideWriter, isPending: isHidingWriter } = useMutation({
		mutationFn: async () => {
			if (!writer) throw new Error("No writer loaded");
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return hideWriterApi({ address: writer.address, authToken });
		},
		mutationKey: ["hide-writer", address],
		onMutate: async () => {
			if (!writer || !userAddress) {
				return undefined;
			}
			const writersQueryKey = ["get-writer-summaries", userAddress] as const;
			const hiddenQueryKey = hiddenWritersQueryKey(userAddress);
			const normalizedWriterAddress = writer.address.toLowerCase();

			await queryClient.cancelQueries({ queryKey: writersQueryKey });
			await queryClient.cancelQueries({ queryKey: hiddenQueryKey });

			const previousWriters =
				queryClient.getQueryData<WriterSummary[]>(writersQueryKey);
			const previousHiddenWriters =
				queryClient.getQueryData<Writer[]>(hiddenQueryKey);

			queryClient.setQueryData<WriterSummary[]>(writersQueryKey, (current) =>
				(current ?? []).filter(
					(candidate) =>
						candidate.address.toLowerCase() !== normalizedWriterAddress,
				),
			);
			queryClient.setQueryData<Writer[]>(hiddenQueryKey, (current) => {
				if (
					current?.some(
						(candidate) =>
							candidate.address.toLowerCase() === normalizedWriterAddress,
					)
				) {
					return current;
				}
				return [writer, ...(current ?? [])];
			});

			return {
				writersQueryKey,
				hiddenQueryKey,
				previousWriters,
				previousHiddenWriters,
			};
		},
		onError: (_error, _variables, context) => {
			if (!context) return;
			queryClient.setQueryData(
				context.writersQueryKey,
				context.previousWriters,
			);
			queryClient.setQueryData(
				context.hiddenQueryKey,
				context.previousHiddenWriters,
			);
		},
		onSuccess: () => {
			setIsHideModalOpen(false);
			router.replace("/home");
		},
		onSettled: () => {
			if (!userAddress) return;
			queryClient.invalidateQueries({
				queryKey: ["get-writer-summaries", userAddress],
			});
			queryClient.invalidateQueries({
				queryKey: hiddenWritersQueryKey(userAddress),
			});
		},
	});

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
						{canHideWriter && (
							<button
								type="button"
								aria-label="Hide Place"
								onClick={() => setIsHideModalOpen(true)}
								className="text-neutral-500 dark:text-neutral-400 hover:text-primary transition-opacity cursor-pointer"
							>
								<ClosedEye className="h-6 w-6" />
							</button>
						)}
						{canEditTitle && (
							<button
								type="button"
								aria-label="Edit Place title"
								onClick={() => setIsTitleModalOpen(true)}
								className="text-neutral-500 dark:text-neutral-400 hover:text-primary transition-opacity cursor-pointer"
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
			<Modal
				open={isHideModalOpen}
				onClose={() => setIsHideModalOpen(false)}
				className="w-auto min-w-48 max-w-[260px] p-4 bg-surface"
			>
				<div className="flex flex-col gap-4 text-center">
					<ModalTitle>Hide</ModalTitle>
					<div className="flex items-center justify-center gap-2">
						<button
							type="button"
							aria-label="Cancel hide"
							onClick={() => setIsHideModalOpen(false)}
							className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
						>
							<Close className="w-5 h-5" />
						</button>
						<button
							type="button"
							aria-label="Confirm hide"
							disabled={isHidingWriter}
							onClick={() => hideWriter()}
							className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-surface rounded-lg w-full flex items-center justify-center"
						>
							<Check className="w-5 h-5" />
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
