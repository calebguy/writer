"use client";

import type { Entry, Writer } from "@/utils/api";
import { createWithChunk } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import { signCreateWithChunk } from "@/utils/signer";
import { compress, encrypt } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Hex } from "viem";
import { CreateEntryDrawer } from "./CreateEntryDrawer";
import CreateInput, { type CreateInputData } from "./CreateInput";
import EntryList from "./EntryList";

export default function EntryListWithCreateInput({
	writerTitle,
	writerAddress,
	writerStorageId,
	writerLegacyDomain,
	processedEntries,
	canCreateEntries = true,
	showUnlockBanner = false,
	isUnlocking = false,
	unlockError,
	onUnlock,
	showLockedEntries = false,
	emptyMessage = "no entries yet",
}: {
	writerTitle: string;
	writerAddress: string;
	/** Frozen storage_id of this writer; used for v4 encryption key derivation. */
	writerStorageId: string;
	/** Whether this writer uses the legacy EIP-712 domain (with chainId). */
	writerLegacyDomain: boolean;
	processedEntries: Entry[];
	canCreateEntries?: boolean;
	showUnlockBanner?: boolean;
	isUnlocking?: boolean;
	unlockError?: string | null;
	onUnlock?: () => void;
	showLockedEntries?: boolean;
	emptyMessage?: string;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
	const router = useRouter();
	const queryClient = useQueryClient();

	const queryKey = ["writer", writerAddress] as const;
	const { mutateAsync, isPending } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", writerAddress],
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<Writer>(queryKey);
			if (!previous) return { previous: undefined };

			const now = new Date().toISOString();
			// Negative temp id so it can't collide with real serial ids from the DB.
			const tempId = -Date.now();
			const optimisticEntry = {
				id: tempId,
				exists: true,
				onChainId: null,
				author: vars.author ?? "",
				createdAtHash: null,
				createdAtBlock: null,
				createdAtBlockDatetime: null,
				deletedAtHash: null,
				deletedAtBlock: null,
				deletedAtBlockDatetime: null,
				updatedAtHash: null,
				updatedAtBlock: null,
				updatedAtBlockDatetime: null,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
				storageAddress: previous.storageAddress,
				storageId: previous.storageId,
				createdAtTransactionId: null,
				deletedAtTransactionId: null,
				updatedAtTransactionId: null,
				chunks: [
					{
						id: tempId,
						entryId: tempId,
						index: 0,
						content: vars.chunkContent,
						createdAt: now,
						createdAtTransactionId: null,
					},
				],
				raw: vars.chunkContent,
				version: vars.chunkContent.startsWith("enc:v5:br:")
					? "enc:v5:br:"
					: vars.chunkContent.startsWith("enc:v4:br:")
						? "enc:v4:br:"
						: "br:",
				// Pre-populating decompressed lets `useProcessedEntries` skip the
				// decrypt step and render the user's typed content instantly.
				decompressed: vars.decompressed ?? "",
			} as unknown as Entry;

			queryClient.setQueryData<Writer>(queryKey, (current) =>
				current
					? { ...current, entries: [optimisticEntry, ...current.entries] }
					: current,
			);

			return { previous };
		},
		onError: (_err, _vars, ctx) => {
			if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
		},
		onSuccess: () => {
			router.refresh();
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const handleSubmit = async ({ markdown, encrypted }: CreateInputData) => {
		if (!writerAddress) {
			console.debug("Could not get writer address when submitting form");
			return;
		}

		if (!wallet) {
			console.error("No wallet found");
			return;
		}

		setIsSubmitting(true);
		try {

		const compressedContent = await compress(markdown);
		let versionedCompressedContent = `br:${compressedContent}`;
		if (encrypted) {
			// New private writes always use v5 (per-writer EIP-712 + HKDF +
			// AES-256-GCM with writer.place branded domain).
			const key = await getCachedDerivedKey(wallet, "v5", writerStorageId);
			const encryptedContent = await encrypt(key, compressedContent);
			versionedCompressedContent = `enc:v5:br:${encryptedContent}`;
		}

		const { signature, nonce, chunkCount, chunkContent } =
			await signCreateWithChunk(wallet, {
				content: versionedCompressedContent,
				address: writerAddress,
				legacyDomain: writerLegacyDomain,
			});

		const authToken = await getAccessToken();
		if (!authToken) {
			console.error("No auth token found");
			return;
		}
		await mutateAsync({
			address: writerAddress as Hex,
			signature,
			nonce,
			chunkCount,
			chunkContent,
			authToken,
			decompressed: markdown,
			author: wallet.address,
		});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<div
				className={`relative ${
					isExpanded
						? "h-full"
						: "grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
				}`}
			>
				{canCreateEntries && (
					<div className="hidden md:block">
						<CreateInput
							placeholder={`Write in ${writerTitle}`}
							onExpand={setIsExpanded}
							canExpand={true}
							onSubmit={handleSubmit}
							isLoading={isSubmitting || isPending}
						/>
					</div>
				)}
				{!isExpanded && processedEntries.length > 0 && (
					<EntryList
						processedEntries={processedEntries}
						writerAddress={writerAddress}
						showLockedEntries={showLockedEntries}
						isUnlocking={isUnlocking}
						unlockError={unlockError}
						onUnlock={showUnlockBanner ? onUnlock : undefined}
					/>
				)}
				{!isExpanded && processedEntries.length === 0 && (
					<div className="col-span-full flex items-center justify-center min-h-[60vh] text-neutral-500">
						{emptyMessage}
					</div>
				)}
			</div>
			{canCreateEntries && (
				<CreateEntryDrawer
					placeholder={`Write in ${writerTitle}`}
					onSubmit={handleSubmit}
					isLoading={isSubmitting || isPending}
				/>
			)}
		</>
	);
}
