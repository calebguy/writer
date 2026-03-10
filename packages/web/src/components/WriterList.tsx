"use client";

import {
	deleteWriter,
	factoryCreate,
	getWriter,
	getWritersByManager,
} from "@/utils/api";
import type { UserWithWallet } from "@/utils/auth";
import { POLLING_INTERVAL } from "@/utils/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import { WriterCardSkeleton } from "./WriterCardSkeleton";
import { ClosedEye } from "./icons/ClosedEye";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

const SKELETON_COUNT = 6;
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_COUNT },
	(_, i) => `skeleton-${i}`,
);

export function WriterList({ user }: { user?: UserWithWallet }) {
	const [isPolling, setIsPolling] = useState(false);
	const queryClient = useQueryClient();

	const address = user?.wallet.address;
	const {
		data: writers,
		isLoading,
		refetch,
	} = useQuery({
		queryFn: () => getWritersByManager(address as Hex),
		queryKey: ["get-writers", address],
		enabled: !!address,
		refetchInterval: isPolling ? POLLING_INTERVAL : false,
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

	const { mutateAsync: hideWriter } = useMutation({
		mutationFn: deleteWriter,
		mutationKey: ["delete-writer"],
	});
	const { mutateAsync: createWriter, isPending: isCreatePending } = useMutation(
		{
			mutationFn: factoryCreate,
			mutationKey: ["create-from-factory"],
			onSuccess: () => {
				refetch();
				setIsPolling(true);
			},
		},
	);

	const handleSubmit = async ({ markdown }: CreateInputData) => {
		if (!address) {
			return;
		}
		await createWriter({
			title: markdown,
			admin: address as Hex,
			managers: [address as Hex],
		});
	};

	useEffect(() => {
		if (isPolling || !writers || writers.length === 0) {
			return;
		}

		const hasPendingWriters = writers.some((writer) => !writer.createdAtHash);
		if (hasPendingWriters) {
			setIsPolling(true);
		}
	}, [isPolling, writers]);

	useEffect(() => {
		if (!isPolling || !writers || writers.length === 0) {
			return;
		}

		const hasPendingWriters = writers.some((writer) => !writer.createdAtHash);
		if (!hasPendingWriters) {
			setIsPolling(false);
		}
	}, [isPolling, writers]);

	return (
		<div className="grid gap-2 grid-cols-1 min-[150px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
			{!!user && (
				<div className="hidden md:block">
					<CreateInput
						placeholder="Create a Place"
						onSubmit={handleSubmit}
						isLoading={isCreatePending}
					/>
				</div>
			)}
			{isLoading &&
				SKELETON_KEYS.map((key) => <WriterCardSkeleton key={key} />)}
			{!isLoading && (writers ?? []).length === 0 && (
				<div className="col-span-full flex items-center justify-center min-h-[60vh] text-neutral-500">
					no writers created yet
				</div>
			)}
			{!isLoading &&
				(writers ?? []).map((writer) =>
					(() => {
						const isPendingWriter = !writer.createdAtHash;
						return (
							<Link
								href={isPendingWriter ? "#" : `/writer/${writer.address}`}
								key={writer.address}
								className={`home-writer-card aspect-square bg-neutral-900 flex flex-col overflow-hidden px-2 pt-2 pb-1.5 relative ${
									isPendingWriter ? "cursor-loading" : "hover:cursor-zoom-in"
								}`}
								onClick={
									isPendingWriter ? (e) => e.preventDefault() : undefined
								}
								onMouseEnter={
									isPendingWriter
										? undefined
										: () => prefetchWriter(writer.address)
								}
							>
								<div className="grow min-h-0 min-w-0 overflow-y-auto">
									<MarkdownRenderer
										markdown={writer.title}
										className="text-white writer-title home-writer-content"
									/>
								</div>
								<div className="writer-card-meta shrink-0 text-right text-sm text-neutral-600 leading-3 pt-2">
									<div
										className={
											isPendingWriter
												? "inline-block"
												: "group home-hide-group inline-block"
										}
									>
										{isPendingWriter ? (
											<span className="pending-entry-spinner inline-flex ml-auto">
												<span className="pending-entry-spinner-track" />
												<AiOutlineLoading3Quarters className="pending-entry-spinner-icon w-3 h-3 rotating" />
											</span>
										) : (
											<>
												<span className="group-hover:hidden block">
													{writer.entries.length.toString()}
												</span>
												<button
													type="button"
													className="group-hover:block hidden ml-auto absolute bottom-1.5 right-2 z-10 text-primary hover:text-primary cursor-pointer"
													onClick={async (e) => {
														e.preventDefault();
														e.stopPropagation();
														await hideWriter(writer.address as Hex);
														refetch();
													}}
												>
													<ClosedEye className="w-4 h-4" />
												</button>
												<div className="absolute left-0 top-0 w-full h-full bg-neutral-900/90 hidden group-hover:flex items-center justify-center pointer-events-none">
													<span className="text-primary italic">Hide?</span>
												</div>
											</>
										)}
									</div>
								</div>
							</Link>
						);
					})(),
				)}
		</div>
	);
}
