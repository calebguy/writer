"use client";

import Entry from "@/components/Entry";
import { useEntryLoading } from "@/utils/EntryLoadingContext";
import {
	ENTRY_QUERY_STALE_TIME,
	type Entry as EntryType,
	WRITER_QUERY_STALE_TIME,
	type Writer,
	entryQueryKey,
	getEntry,
	getWriter,
	writerQueryKey,
} from "@/utils/api";
import {
	getPrivateCachedEntry,
	getPublicCachedEntry,
} from "@/utils/entryCache";
import { useTargetWallet } from "@/utils/hooks";
import { canRenderEntryImmediately } from "@/utils/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { use, useEffect, useState } from "react";
import type { Hex } from "viem";

const PENDING_ENTRY_REFETCH_INTERVAL = 3000;

function getEntryRouteId(entry: EntryType) {
	return entry.onChainId?.toString() ?? entry.id.toString();
}

function findEntryByRouteId(entries: EntryType[] | undefined, id: string) {
	return entries?.find((entry) => getEntryRouteId(entry) === id) ?? null;
}

function samePendingCreate(source: EntryType | null, candidate: EntryType) {
	if (!source || source.onChainId != null) return false;
	if (source.raw !== candidate.raw) return false;
	if (source.storageId.toLowerCase() !== candidate.storageId.toLowerCase()) {
		return false;
	}
	return source.author.toLowerCase() === candidate.author.toLowerCase();
}

function findPendingCreateReplacement(
	entries: EntryType[] | undefined,
	source: EntryType | null,
) {
	return entries?.find((entry) => samePendingCreate(source, entry)) ?? null;
}
function entryHasPendingWrite(entry: EntryType) {
	return (
		entry.onChainId == null ||
		!entry.createdAtHash ||
		(!!entry.updatedAtTransactionId && !entry.updatedAtHash) ||
		(!!entry.deletedAtTransactionId && !entry.deletedAtHash)
	);
}

export default function EntryPage({
	params,
}: {
	params: Promise<{ address: string; id: string }>;
}) {
	const { address, id } = use(params);
	const queryClient = useQueryClient();
	const [wallet] = useTargetWallet();
	const { setEntryLoading } = useEntryLoading();
	const normalizedAddress = address.toLowerCase();
	const entryKey = entryQueryKey(normalizedAddress, id);
	const writerKey = writerQueryKey(normalizedAddress);
	const cachedQueryEntry =
		queryClient.getQueryData<EntryType>(entryKey) ?? null;
	const cachedWriterEntries =
		queryClient.getQueryData<Writer>(writerKey)?.entries ?? [];
	const cachedWriterEntry =
		findEntryByRouteId(cachedWriterEntries, id) ??
		findPendingCreateReplacement(cachedWriterEntries, cachedQueryEntry);
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
	const [confirmedEntryId, setConfirmedEntryId] = useState<string | null>(null);

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
				const privateCached = getPrivateCachedEntry(
					wallet.address,
					address,
					id,
				);
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
	const routeIsPendingEntry = Number(id) < 0;
	const hasInstantEntry = Boolean(
		initialEntry && canRenderEntryImmediately(initialEntry),
	);
	useEffect(() => {
		setEntryLoading(!hasInstantEntry);
		return () => setEntryLoading(false);
	}, [hasInstantEntry, setEntryLoading]);
	const { data: entry, refetch } = useQuery<EntryType>({
		queryKey: entryKey,
		queryFn: ({ signal }) =>
			getEntry(normalizedAddress as Hex, Number(id), signal),
		initialData: initialEntry,
		initialDataUpdatedAt: initialEntry ? Date.now() : undefined,
		enabled: !routeIsPendingEntry && (cacheChecked || Boolean(warmEntry)),
		staleTime: ENTRY_QUERY_STALE_TIME,
		refetchInterval: (query) => {
			const data = query.state.data;
			const pending = !!data?.updatedAtTransactionId && !data?.updatedAtHash;
			return pending ? PENDING_ENTRY_REFETCH_INTERVAL : false;
		},
	});

	const pendingEntrySource = entry ?? cachedEntry ?? warmEntry ?? null;

	const { data: writer } = useQuery({
		queryKey: writerKey,
		queryFn: ({ signal }) => getWriter(normalizedAddress as Hex, signal),
		staleTime: WRITER_QUERY_STALE_TIME,
		refetchInterval: (query) => {
			if (confirmedEntryId) {
				const confirmedEntry = findEntryByRouteId(
					query.state.data?.entries,
					confirmedEntryId,
				);
				return confirmedEntry && entryHasPendingWrite(confirmedEntry)
					? PENDING_ENTRY_REFETCH_INTERVAL
					: false;
			}
			if (!pendingEntrySource || pendingEntrySource.onChainId != null) {
				return false;
			}
			const replacement = findPendingCreateReplacement(
				query.state.data?.entries,
				pendingEntrySource,
			);
			if (!replacement || entryHasPendingWrite(replacement)) {
				return PENDING_ENTRY_REFETCH_INTERVAL;
			}
			return false;
		},
	});

	const writerEntry =
		(confirmedEntryId
			? findEntryByRouteId(writer?.entries, confirmedEntryId)
			: null) ??
		findEntryByRouteId(writer?.entries, id) ??
		findPendingCreateReplacement(writer?.entries, pendingEntrySource);
	useEffect(() => {
		if (writerEntry?.onChainId != null) {
			setConfirmedEntryId(writerEntry.onChainId.toString());
		}
	}, [writerEntry?.onChainId]);
	const displayEntry = writerEntry ?? entry ?? cachedEntry ?? warmEntry;

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

	const displayEntryId = displayEntry.onChainId?.toString() ?? id;
	const displayEntryKey = entryQueryKey(normalizedAddress, displayEntryId);

	return (
		<div className="grow flex flex-col">
			<Entry
				initialEntry={displayEntry}
				address={address}
				id={displayEntryId}
				isPending={displayEntry.onChainId == null}
				legacyDomain={writer?.legacyDomain ?? true}
				onEntryUpdate={() => {
					queryClient.invalidateQueries({ queryKey: entryKey });
					queryClient.invalidateQueries({ queryKey: displayEntryKey });
					refetch();
				}}
			/>
		</div>
	);
}
