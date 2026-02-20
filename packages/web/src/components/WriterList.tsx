"use client";

import {
	deleteWriter,
	factoryCreate,
	getWriter,
	getWritersByManager,
	type Writer,
} from "@/utils/api";
import type { UserWithWallet } from "@/utils/auth";
import { POLLING_INTERVAL } from "@/utils/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import { WriterCardSkeleton } from "./WriterCardSkeleton";
import { ClosedEye } from "./icons/ClosedEye";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

const SKELETON_COUNT = 6;

export function WriterList({ user }: { user?: UserWithWallet }) {
	const [isPolling, setIsPolling] = useState(false);
	const [pendingWriterAddresses, setPendingWriterAddresses] = useState<string[]>(
		[],
	);
	const [optimisticWriters, setOptimisticWriters] = useState<
		Record<string, Writer>
	>({});
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
		onSuccess: ({ writer }) => {
			const writerAddress = writer.address.toLowerCase();
			setOptimisticWriters((prev) => ({
				...prev,
				[writerAddress]: { ...writer, entries: [] },
			}));
			setPendingWriterAddresses((prev) =>
				prev.includes(writerAddress) ? prev : [...prev, writerAddress],
			);
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

	useEffect(() => {
		if (!isPolling) {
			return;
		}

		if (pendingWriterAddresses.length > 0) {
			if (!writers || writers.length === 0) {
				return;
			}

			const remainingPending = pendingWriterAddresses.filter((pendingAddress) => {
				const createdWriter = writers.find(
					(writer) => writer.address.toLowerCase() === pendingAddress,
				);
				// Keep polling until it appears and has an on-chain hash.
				if (!createdWriter) {
					return true;
				}
				return !createdWriter.createdAtHash;
			});

			if (remainingPending.length !== pendingWriterAddresses.length) {
				setPendingWriterAddresses(remainingPending);
			}

			// Once a writer appears in server data, stop rendering it from optimistic state.
			setOptimisticWriters((prev) => {
				if (!writers || Object.keys(prev).length === 0) {
					return prev;
				}

				let changed = false;
				const next = { ...prev };
				for (const writer of writers) {
					const writerAddress = writer.address.toLowerCase();
					if (writerAddress in next) {
						delete next[writerAddress];
						changed = true;
					}
				}
				return changed ? next : prev;
			});

			if (remainingPending.length === 0) {
				setIsPolling(false);
			}
			return;
		}

		// Fallback behavior if we don't have locally tracked pending writers.
		if (!writers || writers.length === 0) {
			setIsPolling(false);
			return;
		}
		const hasPendingWriters = writers.some((writer) => !writer.createdAtHash);
		if (!hasPendingWriters) {
			setIsPolling(false);
		}
	}, [isPolling, pendingWriterAddresses, writers]);

	const displayedWriters = useMemo(() => {
		const optimisticList = Object.values(optimisticWriters);
		if (!writers) {
			return optimisticList;
		}

		if (optimisticList.length === 0) {
			return writers;
		}

		const serverAddressSet = new Set(
			writers.map((writer) => writer.address.toLowerCase()),
		);
		const optimisticOnly = optimisticList.filter(
			(writer) => !serverAddressSet.has(writer.address.toLowerCase()),
		);

		return [...optimisticOnly, ...writers];
	}, [writers, optimisticWriters]);

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
				displayedWriters.map((writer) => (
					<Link
						href={writer.createdAtHash ? `/writer/${writer.address}` : "#"}
						key={writer.address}
						className={`aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 relative ${
							writer.createdAtHash ? "hover:cursor-zoom-in" : "cursor-progress"
						}`}
						onClick={
							writer.createdAtHash ? undefined : (e) => e.preventDefault()
						}
						onMouseEnter={
							writer.createdAtHash
								? () => prefetchWriter(writer.address)
								: undefined
						}
					>
						<MarkdownRenderer markdown={writer.title} className="text-white writer-title" />
						<div className="writer-card-meta text-right text-sm text-neutral-600 leading-3 pt-2">
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
										const writerAddress = writer.address.toLowerCase();
										setPendingWriterAddresses((prev) =>
											prev.filter((address) => address !== writerAddress),
										);
										setOptimisticWriters((prev) => {
											if (!(writerAddress in prev)) {
												return prev;
											}
											const next = { ...prev };
											delete next[writerAddress];
											return next;
										});
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
