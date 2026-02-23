"use client";

import {
	type PublicWriter,
	getSaved,
	getWriter,
	saveWriter,
	unsaveWriter,
} from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { RiBookmarkFill, RiBookmarkLine } from "react-icons/ri";
import type { Hex } from "viem";
import { Lock } from "./icons/Lock";
import { Unlock } from "./icons/Unlock";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

interface PublicWriterListProps {
	writers: PublicWriter[];
}

export default function PublicWriterList({ writers }: PublicWriterListProps) {
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();
	const viewerAddress = wallet?.address.toLowerCase();
	const { data: savedData } = useQuery({
		queryKey: ["saved", viewerAddress],
		queryFn: () => getSaved(viewerAddress as Hex),
		enabled: !!viewerAddress,
	});
	const savedWriterAddresses = useMemo(
		() =>
			new Set(
				(savedData?.writers ?? []).map((item) =>
					item.writer.address.toLowerCase(),
				),
			),
		[savedData?.writers],
	);
	const { mutate: toggleSavedWriter, isPending: isTogglingSave } = useMutation({
		mutationKey: ["toggle-saved-writer"],
		mutationFn: async ({
			writerAddress,
			isSaved,
		}: {
			writerAddress: string;
			isSaved: boolean;
		}) => {
			if (!viewerAddress) return;
			if (isSaved) {
				await unsaveWriter({ userAddress: viewerAddress, writerAddress });
				return;
			}
			await saveWriter({ userAddress: viewerAddress, writerAddress });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["saved", viewerAddress] });
		},
	});

	// Prefetch writer data on hover for instant navigation
	const prefetchWriter = useCallback(
		(writerAddress: string) => {
			queryClient.prefetchQuery({
				queryKey: ["writer", writerAddress],
				queryFn: () => getWriter(writerAddress as Hex),
				staleTime: 30 * 1000,
			});
		},
		[queryClient],
	);

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			{writers.map((writer) => (
				<Link
					href={`/writer/${writer.address}`}
					key={writer.address}
					className="relative aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 hover:cursor-zoom-in"
					onMouseEnter={() => prefetchWriter(writer.address)}
				>
					{viewerAddress && (
						<button
							type="button"
							className="absolute right-2 top-2 text-neutral-500 hover:text-primary z-10 cursor-pointer"
							aria-label={
								savedWriterAddresses.has(writer.address.toLowerCase())
									? "Unsave writer"
									: "Save writer"
							}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (isTogglingSave) return;
								const isSaved = savedWriterAddresses.has(
									writer.address.toLowerCase(),
								);
								toggleSavedWriter({
									writerAddress: writer.address,
									isSaved,
								});
							}}
						>
							{savedWriterAddresses.has(writer.address.toLowerCase()) ? (
								<RiBookmarkFill className="w-4 h-4" />
							) : (
								<RiBookmarkLine className="w-4 h-4" />
							)}
						</button>
					)}
					<MarkdownRenderer
						markdown={writer.title}
						className="text-white writer-title"
					/>
					<div className="writer-card-meta flex items-center justify-end gap-3 text-sm text-neutral-600 leading-3 pt-2">
						{writer.privateCount > 0 &&
							viewerAddress === writer.admin.toLowerCase() && (
								<span className="flex items-end gap-1">
									<Lock className="w-3 h-3 mb-[2px]" />
									{writer.privateCount}
								</span>
							)}
						<span className="flex items-end gap-1">
							<Unlock className="w-3 h-3 mb-[2px]" />
							{writer.publicCount}
						</span>
					</div>
				</Link>
			))}
		</div>
	);
}
