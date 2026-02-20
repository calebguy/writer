"use client";

import CreateInput from "@/components/CreateInput";
import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import EntryListWithCreateInput from "@/components/EntryListWithCreateInput";
import { type Writer, getWriter } from "@/utils/api";
import { useOPWallet, useProcessedEntries } from "@/utils/hooks";
import { hasCachedDerivedKey } from "@/utils/keyCache";
import { isEntryPrivate } from "@/utils/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";

const LOADING_SKELETON_AMOUNT = 6;

export default function WriterPage() {
	const { address } = useParams<{ address: string }>();
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();
	const [shouldPoll, setShouldPoll] = useState(false);
	const [allowDecryption, setAllowDecryption] = useState(false);
	const [unlockError, setUnlockError] = useState<string | null>(null);

	const { data: writer, isLoading } = useQuery({
		queryKey: ["writer", address],
		queryFn: () => getWriter(address as Hex),
		placeholderData: () => {
			// Look through all manager query caches to find this writer
			const queries = queryClient.getQueriesData<Writer[]>({
				queryKey: ["get-writers"],
			});
			for (const [, writers] of queries) {
				const cached = writers?.find(
					(w) => w.address.toLowerCase() === address.toLowerCase(),
				);
				if (cached) return cached;
			}
			return undefined;
		},
		// Poll every 3 seconds when there are pending entries
		refetchInterval: shouldPoll ? 3000 : false,
	});

	// Update polling state when pending entries change
	const hasPendingEntries = writer?.entries?.some((entry) => !entry.onChainId) ?? false;
	useEffect(() => {
		setShouldPoll(hasPendingEntries);
	}, [hasPendingEntries]);

	// Process entries as soon as they arrive - shows immediately, processes private entries in background
	const handleDecryptError = useCallback((error: unknown) => {
		console.error("Unlock private entries failed", error);
		setAllowDecryption(false);
		setUnlockError("Signature request was rejected.");
	}, []);

	const { processedEntries, hasLockedPrivateEntries } = useProcessedEntries(
		writer?.entries,
		address,
		{
			allowDecryption,
			onDecryptError: handleDecryptError,
		},
	);

	const hasPrivateEntries =
		writer?.entries?.some((entry) => isEntryPrivate(entry)) ?? false;
	const showUnlockBanner = hasPrivateEntries && hasLockedPrivateEntries;
	const showLockedEntries = !allowDecryption || Boolean(unlockError);

	useEffect(() => {
		if (!wallet || !hasPrivateEntries) return;
		// Auto-unlock only if the key is already cached (no signature prompt).
		if (hasCachedDerivedKey(wallet, "v2")) {
			setAllowDecryption(true);
		}
	}, [wallet, hasPrivateEntries]);

	// Show loading state during the gap where entries exist but processedEntries hasn't been populated yet
	const isEntriesProcessing = writer?.entries?.length && processedEntries.length === 0;
	const walletAddress = wallet?.address?.toLowerCase();
	const canCreateEntries = Boolean(
		walletAddress &&
			writer?.managers?.some(
				(manager) => manager.toLowerCase() === walletAddress,
			),
	);

	if (!writer || isLoading || isEntriesProcessing) {
		return (
			<div
				className="grid gap-2"
				style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
			>
				{canCreateEntries && (
					<div className="relative">
						<CreateInput onSubmit={() => {}} isLoading={false} />
						<div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center" />
					</div>
				)}
				{Array.from({ length: LOADING_SKELETON_AMOUNT }).map((_, i) => (
					<EntryCardSkeleton key={`skeleton-${i}`} />
				))}
			</div>
		);
	}

	return (
		<EntryListWithCreateInput
			writerTitle={writer.title}
			writerAddress={writer.address}
			processedEntries={processedEntries}
			canCreateEntries={canCreateEntries}
			showUnlockBanner={showUnlockBanner}
			isUnlocking={allowDecryption && !unlockError}
			unlockError={unlockError}
			showLockedEntries={showLockedEntries}
			onUnlock={() => {
				setUnlockError(null);
				setAllowDecryption(true);
			}}
		/>
	);
}
