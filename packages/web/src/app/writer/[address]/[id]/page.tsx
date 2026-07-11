"use client";

import Entry from "@/components/Entry";
import {
	ENTRY_QUERY_STALE_TIME,
	WRITER_QUERY_STALE_TIME,
	type Entry as EntryType,
	type Writer,
	entryQueryKey,
	getEntry,
	getWriter,
	writerQueryKey,
} from "@/utils/api";
import { getPrivateCachedEntry, getPublicCachedEntry } from "@/utils/entryCache";
import { useEntryLoading } from "@/utils/EntryLoadingContext";
import { useOPWallet } from "@/utils/hooks";
import { canRenderEntryImmediately } from "@/utils/utils";
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
	const { setEntryLoading } = useEntryLoading();
	const normalizedAddress = address.toLowerCase();
	const entryKey = entryQueryKey(normalizedAddress, id);
	const writerKey = writerQueryKey(normalizedAddress);
	const cachedQueryEntry = queryClient.getQueryData<EntryType>(entryKey) ?? null;
	const cachedWriterEntry =
		queryClient
			.getQueryData<Writer>(writerKey)
			?.entries.find((entry) => entry.onChainId?.toString() === id) ?? null;
	const warmEntry = cachedQueryEntry ?? cachedWriterEntry;

	useEffect(() => {
		const href = `${window.location.origin}/writer/${address}/${id}.md`;
		const selector = 'link[data-writer-markdown-alternate="entry"]';
		let link = document.head.querySelector<HTMLLinkElement>(selector);
		if (!link) {
			link = document.createElement("link");
			link.rel = "alternate";
			link.type = "text/markdown";
			link.dataset.writerMarkdownAlternate = "entry";
			document.head.appendChild(link);
		}
		link.href = href;

		return () => {
			link?.remove();
		};
	}, [address, id]);

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

	// Use warmed React Query data from the writer grid immediately. IndexedDB
	// still covers direct public-entry visits, but it no longer gates
	// /writer -> /writer/:id transitions after the writer page already has
	// this entry in memory.
	const initialEntry = cachedEntry ?? warmEntry ?? undefined;
	const hasInstantEntry = Boolean(
		initialEntry && canRenderEntryImmediately(initialEntry),
	);
	useEffect(() => {
		setEntryLoading(!hasInstantEntry);
		return () => setEntryLoading(false);
	}, [hasInstantEntry, setEntryLoading]);
	const { data: entry, refetch } = useQuery<EntryType>({
		queryKey: entryKey,
		queryFn: ({ signal }) => getEntry(normalizedAddress as Hex, Number(id), signal),
		initialData: initialEntry,
		initialDataUpdatedAt: initialEntry ? Date.now() : undefined,
		enabled: cacheChecked || Boolean(warmEntry),
		staleTime: ENTRY_QUERY_STALE_TIME,
		// While an edit is pending on-chain confirmation (overlay stamped
		// updatedAtTransactionId but indexer hasn't filled updatedAtHash yet),
		// poll every 3s so the Entry's inline "saving" spinner clears as soon
		// as the indexer catches up.
		refetchInterval: (query) => {
			const data = query.state.data;
			const pending =
				!!data?.updatedAtTransactionId && !data?.updatedAtHash;
			return pending ? 3000 : false;
		},
	});

	const { data: writer } = useQuery({
		queryKey: writerKey,
		queryFn: ({ signal }) => getWriter(normalizedAddress as Hex, signal),
		staleTime: WRITER_QUERY_STALE_TIME,
	});

	const displayEntry = entry ?? cachedEntry;

	if (!displayEntry) {
		return (
			<div className="grow flex flex-col animate-pulse">
				<div className="grow flex flex-col p-2 space-y-3">
					<div className="h-6 bg-surface-raised rounded w-3/4" />
					<div className="h-4 bg-surface-raised rounded w-full" />
					<div className="h-4 bg-surface-raised rounded w-full" />
					<div className="h-4 bg-surface-raised rounded w-5/6" />
					<div className="h-4 bg-surface-raised rounded w-full" />
					<div className="h-4 bg-surface-raised rounded w-2/3" />
					<div className="h-4 bg-surface-raised rounded w-full" />
					<div className="h-4 bg-surface-raised rounded w-4/5" />
				</div>
				<div className="flex items-end mt-3">
					<div className="space-y-1">
						<div className="h-4 bg-surface-raised rounded w-32" />
						<div className="h-4 bg-surface-raised rounded w-28" />
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
				legacyDomain={writer?.legacyDomain ?? true}
				onEntryUpdate={() => {
					queryClient.invalidateQueries({ queryKey: entryKey });
					refetch();
					router.refresh();
				}}
			/>
		</div>
	);
}
