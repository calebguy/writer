"use client";

import {
	WRITER_QUERY_STALE_TIME,
	type PublicWriter,
	getWriter,
	writerQueryKey,
} from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { Hex } from "viem";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

interface PublicWriterListProps {
	writers: PublicWriter[];
}

export default function PublicWriterList({ writers }: PublicWriterListProps) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [wallet] = useOPWallet();
	const viewerAddress = wallet?.address.toLowerCase();

	const prefetchWriter = useCallback(
		(writerAddress: string) => {
			const normalizedAddress = writerAddress.toLowerCase();
			router.prefetch(`/writer/${normalizedAddress}`);
			void queryClient.prefetchQuery({
				queryKey: writerQueryKey(normalizedAddress),
				queryFn: ({ signal }) => getWriter(normalizedAddress as Hex, signal),
				staleTime: WRITER_QUERY_STALE_TIME,
			});
		},
		[queryClient, router],
	);

	return (
		<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
			{writers.map((writer) => (
				<Link
					href={`/writer/${writer.address}`}
					key={writer.address}
					className="aspect-square bg-surface flex flex-col overflow-hidden px-2 pt-2 pb-1.5 hover:cursor-zoom-in rounded-xs"
					onPointerEnter={() => prefetchWriter(writer.address)}
				>
					<div className="grow min-h-0 min-w-0 overflow-y-auto">
						<MarkdownRenderer
							markdown={writer.title}
							className="text-black dark:text-white writer-title"
						/>
					</div>
					<div className="writer-card-meta shrink-0 flex items-center justify-end gap-3 text-sm text-neutral-400 dark:text-neutral-600 leading-3 pt-2">
						<span className="flex items-end gap-1">{writer.publicCount}</span>
					</div>
				</Link>
			))}
		</div>
	);
}
