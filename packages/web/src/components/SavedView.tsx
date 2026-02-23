"use client";

import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import { WriterCardSkeleton } from "@/components/WriterCardSkeleton";
import { type SavedEntry, type SavedWriter, getSaved } from "@/utils/api";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";
import type { Hex } from "viem";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const SAVED_WRITER_SKELETON_KEYS = [
	"saved-writer-0",
	"saved-writer-1",
	"saved-writer-2",
];
const SAVED_ENTRY_SKELETON_KEYS = [
	"saved-entry-0",
	"saved-entry-1",
	"saved-entry-2",
];

export default function SavedView({ userAddress }: { userAddress: Hex }) {
	const { data, isLoading } = useQuery({
		queryKey: ["saved", userAddress.toLowerCase()],
		queryFn: () => getSaved(userAddress),
	});

	const savedWriters = data?.writers ?? [];
	const savedEntries = data?.entries ?? [];

	const sortedWriters = useMemo(
		() =>
			[...savedWriters].sort(
				(a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
			),
		[savedWriters],
	);
	const sortedEntries = useMemo(
		() =>
			[...savedEntries].sort(
				(a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
			),
		[savedEntries],
	);

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					{SAVED_WRITER_SKELETON_KEYS.map((key) => (
						<WriterCardSkeleton key={key} />
					))}
				</div>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					}}
				>
					{SAVED_ENTRY_SKELETON_KEYS.map((key) => (
						<EntryCardSkeleton key={key} />
					))}
				</div>
			</div>
		);
	}

	if (sortedWriters.length === 0 && sortedEntries.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-neutral-500">
				Nothing saved yet
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{sortedWriters.length > 0 && (
				<section className="flex flex-col gap-2">
					<div className="text-primary text-sm uppercase tracking-wide">
						Saved Writers
					</div>
					<SavedWriterGrid writers={sortedWriters} />
				</section>
			)}
			{sortedEntries.length > 0 && (
				<section className="flex flex-col gap-2">
					<div className="text-primary text-sm uppercase tracking-wide">
						Saved Entries
					</div>
					<SavedEntryGrid entries={sortedEntries} />
				</section>
			)}
		</div>
	);
}

function SavedWriterGrid({ writers }: { writers: SavedWriter[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{writers.map((item) => (
				<Link
					href={`/writer/${item.writer.address}`}
					key={`${item.writer.address}-${item.savedAt}`}
					className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 hover:cursor-zoom-in"
				>
					<MarkdownRenderer
						markdown={item.writer.title}
						className="text-white writer-title"
					/>
					<div className="writer-card-meta text-right text-sm text-neutral-600 leading-3 pt-2">
						Saved {format(new Date(item.savedAt), "MMM do, yyyy")}
					</div>
				</Link>
			))}
		</div>
	);
}

function SavedEntryGrid({ entries }: { entries: SavedEntry[] }) {
	return (
		<div
			className="grid gap-2"
			style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
		>
			{entries.map((item) => {
				const entry = item.entry;
				const isPending = !entry.onChainId;
				const href = isPending
					? "#"
					: `/writer/${item.writer.address}/${entry.onChainId?.toString()}`;

				return (
					<Link
						href={href}
						key={`${entry.id}-${item.savedAt}`}
						className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden hover:cursor-zoom-in"
						onClick={isPending ? (e) => e.preventDefault() : undefined}
					>
						<div className="overflow-y-scroll grow min-h-0">
							<MarkdownRenderer
								markdown={entry.decompressed ?? entry.raw}
								className="text-white"
								links={false}
							/>
						</div>
						<div className="writer-card-meta text-neutral-600 flex items-end justify-between text-sm leading-3 pt-2 shrink-0 pb-2">
							<span>{item.writer.title}</span>
							<span>{format(new Date(item.savedAt), "MMM do")}</span>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
