"use client";

import type { Entry } from "@/utils/api";
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
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
	const router = useRouter();
	const queryClient = useQueryClient();

	const { mutateAsync, isPending } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", writerAddress],
		onSuccess: () => {
			// Invalidate writer query to refetch entries including the new one
			queryClient.invalidateQueries({ queryKey: ["writer", writerAddress] });
			router.refresh();
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

		const compressedContent = await compress(markdown);
		let versionedCompressedContent = `br:${compressedContent}`;
		if (encrypted) {
			// New private writes always use v4 (per-writer EIP-712 + HKDF +
			// AES-256-GCM). v1/v2/v3 read paths still work for legacy entries
			// but no new entries are created with those formats.
			const key = await getCachedDerivedKey(wallet, "v4", writerStorageId);
			const encryptedContent = await encrypt(key, compressedContent);
			versionedCompressedContent = `enc:v4:br:${encryptedContent}`;
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
		});
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
							isLoading={isPending}
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
					isLoading={isPending}
				/>
			)}
		</>
	);
}
