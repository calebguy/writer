"use client";

import type { Entry, Writer } from "@/utils/api";
import { createWithChunk } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import {
	PENDING_PRIVATE_ENTRY_RAW,
	PENDING_PUBLIC_ENTRY_RAW,
	buildOptimisticEntry,
	prependOptimisticEntry,
	removeOptimisticEntry,
	replaceOptimisticEntryRaw,
} from "@/utils/optimisticEntry";
import { signCreateWithChunk } from "@/utils/signer";
import { compress, encrypt } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Hex } from "viem";
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
	const [isSigning, setIsSigning] = useState(false);
	const nextOptimisticEntryIdRef = useRef(-1);
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
	const router = useRouter();
	const queryClient = useQueryClient();
	const normalizedWriterAddress = writerAddress.toLowerCase();
	// External wallets (MetaMask, WalletConnect, etc.) pop a signature prompt;
	// Privy's embedded wallet signs silently, so we only show a loader for external.
	const isExternalWallet = !!wallet && wallet.walletClientType !== "privy";

	const queryKey = ["writer", normalizedWriterAddress] as const;
	const { mutateAsync } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", normalizedWriterAddress],
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

		const optimisticEntryId = nextOptimisticEntryIdRef.current--;
		let insertedOptimisticEntry = false;

		const insertOptimisticEntry = (raw: string) => {
			const writer = queryClient.getQueryData<Writer>(queryKey);
			if (!writer) return;

			const optimisticEntry = buildOptimisticEntry(writer, {
				id: optimisticEntryId,
				markdown,
				raw,
				author: wallet.address,
			});

			queryClient.setQueryData<Writer>(queryKey, (current) =>
				current ? prependOptimisticEntry(current, optimisticEntry) : current,
			);
			insertedOptimisticEntry = true;
		};

		const removePendingEntry = () => {
			if (!insertedOptimisticEntry) return;
			queryClient.setQueryData<Writer>(queryKey, (current) =>
				current ? removeOptimisticEntry(current, optimisticEntryId) : current,
			);
			insertedOptimisticEntry = false;
		};

		// Embedded wallets sign silently; put their card in the grid immediately,
		// before compression/signing/auth can create a visible empty-frame flash.
		// External wallets keep the existing signing loader until the user acts on
		// the wallet prompt, then the card moves into the grid before POSTing.
		void queryClient.cancelQueries({ queryKey });
		if (!isExternalWallet) {
			insertOptimisticEntry(
				encrypted ? PENDING_PRIVATE_ENTRY_RAW : PENDING_PUBLIC_ENTRY_RAW,
			);
		}

		if (isExternalWallet) setIsSigning(true);
		let signed: Awaited<ReturnType<typeof signCreateWithChunk>>;
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

			signed = await signCreateWithChunk(wallet, {
				content: versionedCompressedContent,
				address: writerAddress,
				legacyDomain: writerLegacyDomain,
			});
		} catch (error) {
			removePendingEntry();
			throw error;
		} finally {
			if (isExternalWallet) setIsSigning(false);
		}

		if (!insertedOptimisticEntry) {
			insertOptimisticEntry(signed.chunkContent);
		} else {
			queryClient.setQueryData<Writer>(queryKey, (current) =>
				current
					? replaceOptimisticEntryRaw(
							current,
							optimisticEntryId,
							signed.chunkContent,
						)
					: current,
			);
		}

		try {
			const authToken = await getAccessToken();
			if (!authToken) {
				throw new Error("No auth token found");
			}

			await mutateAsync({
				address: writerAddress as Hex,
				signature: signed.signature,
				nonce: signed.nonce,
				chunkCount: signed.chunkCount,
				chunkContent: signed.chunkContent,
				authToken,
				decompressed: markdown,
				author: wallet.address,
			});
		} catch (error) {
			removePendingEntry();
			throw error;
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
					<div className="hidden lg:block">
						<CreateInput
							placeholderMarkdown={`Write in Place:\n ${writerTitle}`}
							onExpand={setIsExpanded}
							canExpand={true}
							onSubmit={handleSubmit}
							isLoading={isSigning}
							unsavedChangesMessage="Discard this unsaved Entry?"
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
				{/* TODO do we need to fix this elsewhere? ie: when we only have private entries and someone hits this page */}
				{/* {!isExpanded && processedEntries.length === 0 && (
					<div className="col-span-full flex items-center justify-center min-h-[60vh] text-neutral-500">
						{emptyMessage}
					</div>
				)} */}
			</div>
		</>
	);
}
