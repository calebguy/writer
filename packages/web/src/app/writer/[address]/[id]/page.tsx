"use client";

import Entry from "@/components/Entry";
import { type Entry as EntryType, getEntry } from "@/utils/api";
import { getCachedEntry } from "@/utils/entryCache";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import type { Hex } from "viem";

export default function EntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = use(params);
	const router = useRouter();

	// Initialize with cached entry if available (sync read from global cache)
	const [entry, setEntry] = useState<EntryType | undefined>(() =>
		getCachedEntry(address, id),
	);

	// Fetch if not cached
	useEffect(() => {
		if (!entry) {
			getEntry(address as Hex, Number(id)).then(setEntry);
		}
	}, [address, id, entry]);

	if (!entry) {
		return (
			<div className="grow flex flex-col animate-pulse">
				<div className="grow flex flex-col p-2 space-y-3">
					<div className="h-6 bg-neutral-700 rounded w-3/4" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-5/6" />
				</div>
			</div>
		);
	}

	return (
		<div className="grow flex flex-col">
			<Entry
				initialEntry={entry}
				address={address}
				id={id}
				onEntryUpdate={() => {
					getEntry(address as Hex, Number(id)).then(setEntry);
					router.refresh();
				}}
			/>
		</div>
	);
}
