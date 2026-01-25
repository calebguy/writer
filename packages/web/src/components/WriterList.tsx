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
import { useCallback, useState } from "react";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import { WriterCardSkeleton } from "./WriterCardSkeleton";
import { ClosedEye } from "./icons/ClosedEye";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

const SKELETON_COUNT = 6;

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

	const { mutateAsync, isPending } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory"],
		onSuccess: () => {
			refetch();
			setIsPolling(true);
		},
	});

	const { mutateAsync: hideWriter } = useMutation({
		mutationFn: deleteWriter,
		mutationKey: ["delete-writer"],
	});

	const handleSubmit = async ({ markdown }: CreateInputData) => {
		await mutateAsync({
			title: markdown,
			admin: address as Hex,
			managers: [address as Hex],
		});
	};

	// useEffect(() => {
	// 	const isAllOnChain = data?.every((writer) => writer.createdAtHash);
	// 	if (isAllOnChain) {
	// 		setIsPolling(false);
	// 	} else if (!isPolling) {
	// 		setIsPolling(true);
	// 	}
	// }, [data, isPolling]);

	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
			}}
		>
			{!!user && (
				<CreateInput
					placeholder="Create a Place"
					onSubmit={handleSubmit}
					isLoading={isPending}
				/>
			)}
			{isLoading &&
				Array.from({ length: SKELETON_COUNT }).map((_, i) => (
					<WriterCardSkeleton key={`skeleton-${i}`} />
				))}
			{!isLoading &&
				writers?.map((writer) => (
					<Link
						href={`/writer/${writer.address}`}
						key={writer.address}
						className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 hover:cursor-zoom-in relative"
						onMouseEnter={() => prefetchWriter(writer.address)}
					>
						<MarkdownRenderer markdown={writer.title} className="text-white" />
						<div className="text-right text-sm text-neutral-600 leading-3 pt-2">
							<div className="group inline-block">
								<span className="group-hover:hidden block">
									{writer.entries.length.toString()}
								</span>
								<button
									type="button"
									className="group-hover:block hidden ml-auto absolute bottom-1.5 right-2 z-10 hover:text-primary cursor-pointer"
									onClick={async (e) => {
										e.preventDefault();
										e.stopPropagation();
										await hideWriter(writer.address as Hex);
										refetch();
									}}
								>
									<ClosedEye className="w-4 h-4" />
								</button>
								<div className="absolute left-0 top-0 w-full h-full bg-neutral-900/90 hidden group-hover:flex items-center justify-center">
									<span className="text-primary italic">Hide?</span>
								</div>
							</div>
						</div>
					</Link>
				))}
		</div>
	);
}
