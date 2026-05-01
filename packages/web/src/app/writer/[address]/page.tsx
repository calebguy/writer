"use client";

import CreateInput from "@/components/CreateInput";
import { EntryCardSkeleton } from "@/components/EntryCardSkeleton";
import EntryListWithCreateInput from "@/components/EntryListWithCreateInput";
import {
	type Writer,
	getSaved,
	getWriter,
	saveWriter,
	unsaveWriter,
} from "@/utils/api";
import { useOPWallet, useProcessedEntries } from "@/utils/hooks";
import { hasCachedDerivedKey } from "@/utils/keyCache";
import { isEntryPrivate } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import {
	useIsMutating,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Hex } from "viem";

const LOADING_SKELETON_AMOUNT = 15;
const LOADING_SKELETON_KEYS = Array.from(
	{ length: LOADING_SKELETON_AMOUNT },
	(_, i) => `writer-entry-skeleton-${i}`,
);

export default function WriterPage() {
	const { address } = useParams<{ address: string }>();
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();
	const { getAccessToken, authenticated, ready } = usePrivy();
	const isLoggedIn = ready && authenticated;
	const [shouldPoll, setShouldPoll] = useState(false);
	const [allowDecryption, setAllowDecryption] = useState(false);
	const [unlockError, setUnlockError] = useState<string | null>(null);

	const isCreatingEntry =
		useIsMutating({ mutationKey: ["create-with-chunk", address] }) > 0;

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
		// Poll every 3 seconds when there are pending entries, but pause while a
		// create mutation is in flight so the refetch can't clobber the
		// optimistic entry before the server has persisted it.
		refetchInterval: shouldPoll && !isCreatingEntry ? 3000 : false,
	});

	// Update polling state when pending entries change
	const hasPendingEntries =
		writer?.entries?.some((entry) => !entry.onChainId) ?? false;
	useEffect(() => {
		setShouldPoll(hasPendingEntries);
	}, [hasPendingEntries]);

	// Process entries as soon as they arrive - shows immediately, processes private entries in background
	const handleDecryptError = useCallback((error: unknown) => {
		console.error("Unlock private entries failed", error);
		setAllowDecryption(false);
		setUnlockError("Signature request was rejected.");
	}, []);

	const { processedEntries, hasLockedPrivateEntries, processedOnce } =
		useProcessedEntries(writer?.entries, address, {
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
		if (!wallet || !hasPrivateEntries) return;
		// Auto-unlock only if a key is already cached (no signature prompt).
		// For v4 entries the key is per-writer, so we check this writer's
		// specific storage_id.
		const v4Cached = writer?.storageId
			? hasCachedDerivedKey(wallet, "v4", writer.storageId)
			: false;
		if (
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
	const { data: savedData } = useQuery({
		queryKey: ["saved", walletAddress],
		queryFn: () => getSaved(walletAddress as Hex),
		enabled: !!walletAddress,
	});
	const isSavedWriter = useMemo(
		() =>
			Boolean(
				savedData?.writers?.some(
					(item) =>
						item.writer.address.toLowerCase() === writer?.address.toLowerCase(),
				),
			),
		[savedData?.writers, writer?.address],
	);
	const { mutate: toggleSaveWriter, isPending: isTogglingSaveWriter } =
		useMutation({
			mutationKey: ["toggle-save-writer", walletAddress, writer?.address],
			mutationFn: async () => {
				if (!walletAddress || !writer?.address) return;
				const authToken = await getAccessToken();
				if (!authToken) return;
				if (isSavedWriter) {
					await unsaveWriter({
						userAddress: walletAddress,
						writerAddress: writer.address,
						authToken,
					});
					return;
				}
				await saveWriter({
					userAddress: walletAddress,
					writerAddress: writer.address,
					authToken,
				});
			},
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["saved", walletAddress] });
			},
		});
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
				{canCreateEntries && (
					<div className="relative">
						<CreateInput onSubmit={() => {}} />
						<div className="absolute inset-0 bg-surface-overlay/90 flex flex-col items-center justify-center" />
					</div>
				)}
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
			{isLoggedIn && walletAddress && processedEntries.length > 0 && (
				<div className="sticky bottom-0 left-0 pt-2">
					<button
						type="button"
						className="text-neutral-400 dark:text-neutral-600 hover:text-secondary cursor-pointer"
						disabled={isTogglingSaveWriter}
						onClick={() => toggleSaveWriter()}
					>
						{isSavedWriter ? "unsave" : "save"}
					</button>
				</div>
			)}
		</div>
	);
}
