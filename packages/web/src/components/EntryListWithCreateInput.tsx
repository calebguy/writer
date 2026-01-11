"use client";

import type { Entry } from "@/utils/api";
import { createWithChunk } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { getDerivedSigningKey, signCreateWithChunk } from "@/utils/signer";
import { compress, encrypt } from "@/utils/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Hex } from "viem";
import CreateInput, { type CreateInputData } from "./CreateInput";
import EntryList from "./EntryList";

export default function EntryListWithCreateInput({
	writerTitle,
	writerAddress,
	processedEntries,
	isProcessing,
}: {
	writerTitle: string;
	writerAddress: string;
	processedEntries: Map<number, Entry>;
	isProcessing: boolean;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [wallet] = useOPWallet();
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
			const key = await getDerivedSigningKey(wallet);
			const encryptedContent = await encrypt(key, compressedContent);
			versionedCompressedContent = `enc:br:${encryptedContent}`;
		}

		const { signature, nonce, chunkCount, chunkContent } =
			await signCreateWithChunk(wallet, {
				content: versionedCompressedContent,
				address: writerAddress,
			});

		await mutateAsync({
			address: writerAddress as Hex,
			signature,
			nonce,
			chunkCount,
			chunkContent,
		});
	};

	return (
		<div
			className={`relative ${isExpanded ? "h-full" : "grid gap-2"}`}
			style={
				!isExpanded
					? { gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }
					: undefined
			}
		>
			<CreateInput
				placeholder={`Write in ${writerTitle}`}
				onExpand={setIsExpanded}
				canExpand={true}
				onSubmit={handleSubmit}
				isLoading={isPending}
			/>
			{!isExpanded && (
				<EntryList
					processedEntries={processedEntries}
					isProcessing={isProcessing}
					writerAddress={writerAddress}
				/>
			)}
		</div>
	);
}
