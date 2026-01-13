"use client";

import Entry from "@/components/Entry";
import { type Entry as EntryType, getEntry } from "@/utils/api";
import { getPrivateCachedEntry, getPublicCachedEntry } from "@/utils/entryCache";
import { useOPWallet } from "@/utils/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();

	// Check cache on mount (async for IndexedDB)
	const [cachedEntry, setCachedEntry] = useState<EntryType | null>(null);
	const [cacheChecked, setCacheChecked] = useState(false);

	useEffect(() => {
		async function checkCache() {
			// Try public cache first (IndexedDB)
			const publicCached = await getPublicCachedEntry(address, id);
			if (publicCached) {
				setCachedEntry(publicCached);
				setCacheChecked(true);
				return;
			}

			// Try private cache (memory) if we have a wallet
			if (wallet?.address) {
				const privateCached = getPrivateCachedEntry(wallet.address, address, id);
				if (privateCached) {
					setCachedEntry(privateCached);
					setCacheChecked(true);
					return;
				}
			}

			setCacheChecked(true);
		}

		checkCache();
	}, [address, id, wallet?.address]);

	// Use React Query with cache as initial data
	const { data: entry, refetch } = useQuery({
		queryKey: ["entry", address, id],
		queryFn: () => getEntry(address as Hex, Number(id)),
		initialData: cachedEntry ?? undefined,
		enabled: cacheChecked && !cachedEntry, // Only fetch if cache miss
		staleTime: 30 * 1000, // 30 seconds
	});

	const displayEntry = entry ?? cachedEntry;

	if (!displayEntry) {
		return (
			<div className="grow flex flex-col animate-pulse">
				<div className="grow flex flex-col p-2 space-y-3">
					<div className="h-6 bg-neutral-700 rounded w-3/4" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-5/6" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-2/3" />
					<div className="h-4 bg-neutral-700 rounded w-full" />
					<div className="h-4 bg-neutral-700 rounded w-4/5" />
				</div>
				<div className="flex items-end mt-3">
					<div className="space-y-1">
						<div className="h-4 bg-neutral-700 rounded w-32" />
						<div className="h-4 bg-neutral-700 rounded w-28" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grow flex flex-col">
			<Entry
				initialEntry={displayEntry}
				address={address}
				id={id}
				onEntryUpdate={() => {
					// Invalidate and refetch
					queryClient.invalidateQueries({ queryKey: ["entry", address, id] });
					refetch();
					router.refresh();
				}}
			/>
		</div>
	);
}
