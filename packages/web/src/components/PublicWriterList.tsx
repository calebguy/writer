"use client";

import { getWriter, type PublicWriter } from "@/utils/api";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback } from "react";
import type { Hex } from "viem";
import { Lock } from "./icons/Lock";
import { Unlock } from "./icons/Unlock";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

interface PublicWriterListProps {
	writers: PublicWriter[];
}

export default function PublicWriterList({ writers }: PublicWriterListProps) {
	const queryClient = useQueryClient();

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
					className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 hover:cursor-zoom-in"
					onMouseEnter={() => prefetchWriter(writer.address)}
				>
					<MarkdownRenderer markdown={writer.title} className="text-white" />
					<div className="flex items-center justify-end gap-3 text-sm text-neutral-600 leading-3 pt-2">
						{writer.privateCount > 0 && (
							<span className="flex items-center gap-1">
								<Lock className="w-3 h-3" />
								{writer.privateCount}
							</span>
						)}
						<span className="flex items-center gap-1">
							<Unlock className="w-3 h-3" />
							{writer.publicCount}
						</span>
					</div>
				</Link>
			))}
		</div>
	);
}
