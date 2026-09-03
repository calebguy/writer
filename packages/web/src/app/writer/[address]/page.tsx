"use client";

import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import EntryListWithCreateInput from "@/components/EntryListWithCreateInput";
import {
	WRITER_QUERY_STALE_TIME,
	type Writer,
	getWriter,
	writerQueryKey,
} from "@/utils/api";
import { GRID_SKELETON_COUNT } from "@/utils/constants";
import { useTargetWallet, useProcessedEntries } from "@/utils/hooks";
import { hasCachedDerivedKey } from "@/utils/keyCache";
import { isEntryPrivate } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";

const LOADING_SKELETON_KEYS = Array.from(
	{ length: GRID_SKELETON_COUNT },
	(_, i) => `writer-entry-skeleton-${i}`,
);

export default function WriterPage() {
	const { address } = useParams<{ address: string }>();
	const normalizedAddress = address.toLowerCase();
	const [wallet] = useTargetWallet();
	const { authenticated, ready } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [shouldPoll, setShouldPoll] = useState(false);
	const [allowDecryption, setAllowDecryption] = useState(false);
	const [unlockError, setUnlockError] = useState<string | null>(null);

	const isCreatingEntry =
		useIsMutating({ mutationKey: ["create-with-chunk", normalizedAddress] }) >
		0;
	const isEditingEntry =
		useIsMutating({ mutationKey: ["edit-entry", normalizedAddress] }) > 0;
	const isDeletingEntry =
		useIsMutating({ mutationKey: ["delete-entry", normalizedAddress] }) > 0;
	const isWritingEntry = isCreatingEntry || isEditingEntry || isDeletingEntry;

	const { data: writer, isLoading } = useQuery<Writer>({
		queryKey: writerQueryKey(normalizedAddress),
		queryFn: ({ signal }) => getWriter(normalizedAddress as Hex, signal),
		staleTime: WRITER_QUERY_STALE_TIME,
		// Poll while any entry write is waiting on the indexer, but pause while a
		// mutation request is still in flight so stale server data can't clobber
		// the optimistic cache before the server has recorded the pending tx.
		refetchInterval: shouldPoll && !isWritingEntry ? 3000 : false,
	});

	const hasPendingEntryWrites =
		writer?.entries?.some(
			(entry) =>
				entry.onChainId == null ||
				!entry.createdAtHash ||
				(!!entry.updatedAtTransactionId && !entry.updatedAtHash) ||
				(!!entry.deletedAtTransactionId && !entry.deletedAtHash),
		) ?? false;
	useEffect(() => {
		setShouldPoll(hasPendingEntryWrites);
	}, [hasPendingEntryWrites]);

	// Process entries as soon as they arrive - shows immediately, processes private entries in background
	const handleDecryptError = useCallback((error: unknown) => {
		console.error("Unlock private entries failed", error);
		setAllowDecryption(false);
		setUnlockError("Signature request was rejected.");
	}, []);

	const { processedEntries, hasLockedPrivateEntries, processedOnce } =
		useProcessedEntries(writer?.entries, normalizedAddress, {
			allowDecryption,
			onDecryptError: handleDecryptError,
		});

	const hasPrivateEntries =
		writer?.entries?.some((entry) => isEntryPrivate(entry)) ?? false;
	const allEntriesPrivate =
		(writer?.entries?.length ?? 0) > 0 &&
		writer?.entries?.every((entry) => isEntryPrivate(entry));
	const showUnlockBanner = hasPrivateEntries && hasLockedPrivateEntries;
	const showLockedEntries = !allowDecryption || Boolean(unlockError);

	useEffect(() => {
		const href = `${window.location.origin}/writer/${normalizedAddress}.md`;
		const selector = 'link[data-writer-markdown-alternate="place"]';
		let link = document.head.querySelector<HTMLLinkElement>(selector);
		if (!link) {
			link = document.createElement("link");
			link.rel = "alternate";
			link.type = "text/markdown";
			link.dataset.writerMarkdownAlternate = "place";
			document.head.appendChild(link);
		}
		link.href = href;

		return () => {
			link?.remove();
		};
	}, [normalizedAddress]);

	useEffect(() => {
		if (!wallet || !hasPrivateEntries) return;
		// Auto-unlock only if a key is already cached (no signature prompt).
		// For v4/v5 entries the key is per-writer, so we check this writer's
		// specific storage_id.
		const v5Cached = writer?.storageId
			? hasCachedDerivedKey(wallet, "v5", writer.storageId)
			: false;
		const v4Cached = writer?.storageId
			? hasCachedDerivedKey(wallet, "v4", writer.storageId)
			: false;
		if (
			v5Cached ||
			v4Cached ||
			hasCachedDerivedKey(wallet, "v3") ||
			hasCachedDerivedKey(wallet, "v2")
		) {
			setAllowDecryption(true);
		}
	}, [wallet, hasPrivateEntries, writer?.storageId]);

	// Show loading state during the gap where entries exist but processedEntries hasn't been populated yet
	const isEntriesProcessing =
		writer?.entries?.length && processedEntries.length === 0 && !processedOnce;
	const walletAddress = wallet?.address?.toLowerCase();
	// Anyone signed in can create entries on a public-writable Writer.
	// Otherwise, only addresses in the writer's managers list can. Edit
	// and delete are still restricted to the original author of each
	// entry — see Entry.tsx's `canEdit` (which checks isWalletAuthor).
	const canCreateEntries =
		isLoggedIn &&
		Boolean(
			walletAddress &&
				(writer?.publicWritable ||
					writer?.managers?.some(
						(manager) => manager.toLowerCase() === walletAddress,
					)),
		);

	if (!writer || isLoading || isEntriesProcessing) {
		return (
			<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
				{LOADING_SKELETON_KEYS.map((key) => (
					<EntryCardSkeleton key={key} />
				))}
			</div>
		);
	}

	return (
		<div className="grow flex flex-col">
			<EntryListWithCreateInput
				writerTitle={writer.title}
				writerAddress={writer.address}
				writerStorageId={writer.storageId}
				writerLegacyDomain={writer.legacyDomain}
				processedEntries={processedEntries}
				canCreateEntries={canCreateEntries}
				showUnlockBanner={showUnlockBanner}
				isUnlocking={allowDecryption && !unlockError}
				unlockError={unlockError}
				showLockedEntries={showLockedEntries}
				emptyMessage={
					allEntriesPrivate && !canCreateEntries
						? "no public entries"
						: "no entries yet"
				}
				onUnlock={() => {
					setUnlockError(null);
					setAllowDecryption(true);
				}}
			/>
		</div>
	);
}
