"use client";

import { Check } from "@/components/icons/Check";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { useComposeHeaderActions } from "@/components/writer/ComposeHeaderActionsContext";
import {
	type Entry,
	type Writer,
	createWithChunk,
	getWriter,
} from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { getCachedDerivedKey } from "@/utils/keyCache";
import { signCreateWithChunk } from "@/utils/signer";
import { compress, encrypt } from "@/utils/utils";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Hex } from "viem";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function MobileCreateEntryPage({ address }: { address: string }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const normalizedAddress = address.toLowerCase();
	const [wallet] = useOPWallet();
	const { getAccessToken } = usePrivy();
	const { setActions } = useComposeHeaderActions();
	const [markdown, setMarkdown] = useState("");
	const [encrypted, setEncrypted] = useState(false);
	const [isSigning, setIsSigning] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isExternalWallet = !!wallet && wallet.walletClientType !== "privy";

	const queryKey = ["writer", normalizedAddress] as const;
	const { data: writer } = useQuery<Writer>({
		queryKey,
		queryFn: ({ signal }) => getWriter(normalizedAddress as Hex, signal),
	});

	const { mutate } = useMutation({
		mutationFn: createWithChunk,
		mutationKey: ["create-with-chunk", normalizedAddress],
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<Writer>(queryKey);
			if (!previous) return { previous };

			const now = new Date().toISOString();
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
			if (ctx?.previous) {
				queryClient.setQueryData(queryKey, ctx.previous);
			}
		},
		onSuccess: () => {
			router.refresh();
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const handleExit = () => {
		if (markdown.trim() && !window.confirm("Discard this Entry?")) return;
		router.push(`/writer/${address}`);
	};

	const handleCreate = async () => {
		if (!markdown.trim() || !writer || !wallet || isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (isExternalWallet) setIsSigning(true);
			const compressedContent = await compress(markdown);
			let versionedCompressedContent = `br:${compressedContent}`;
			if (encrypted) {
				const key = await getCachedDerivedKey(wallet, "v5", writer.storageId);
				const encryptedContent = await encrypt(key, compressedContent);
				versionedCompressedContent = `enc:v5:br:${encryptedContent}`;
			}

			const signed = await signCreateWithChunk(wallet, {
				content: versionedCompressedContent,
				address: writer.address,
				legacyDomain: writer.legacyDomain,
			});

			const authToken = await getAccessToken();
			if (!authToken) {
				console.error("No auth token found");
				setIsSubmitting(false);
				return;
			}

			mutate(
				{
					address: writer.address as Hex,
					signature: signed.signature,
					nonce: signed.nonce,
					chunkCount: signed.chunkCount,
					chunkContent: signed.chunkContent,
					authToken,
					decompressed: markdown,
					author: wallet.address,
				},
				{
					onError: (err) => {
						console.error("Create entry failed:", err);
					},
				},
			);
			router.push(`/writer/${address}`);
		} catch (err) {
			console.error("Create entry failed:", err);
			setIsSubmitting(false);
		} finally {
			if (isExternalWallet) setIsSigning(false);
		}
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				handleExit();
			}
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				void handleCreate();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [markdown, encrypted, writer, wallet?.address, isSubmitting]);

	useEffect(() => {
		setActions(
			<>
				<button
					type="button"
					aria-label={encrypted ? "Make public" : "Make private"}
					onClick={() => setEncrypted(!encrypted)}
					className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer"
				>
					{encrypted ? (
						<Lock className="h-4 w-4" />
					) : (
						<Unlock className="h-4 w-4" />
					)}
				</button>
				<button
					type="button"
					aria-label="Create Entry"
					onClick={() => void handleCreate()}
					disabled={!markdown.trim() || !writer || !wallet || isSubmitting}
					className={cn(
						"text-primary hover:text-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
					)}
				>
					{isSigning ? (
						<span className="font-mono text-sm">sign</span>
					) : (
						<Check className="w-7 h-7" />
					)}
				</button>
			</>,
		);
		return () => setActions(null);
	}, [
		encrypted,
		isSigning,
		isSubmitting,
		markdown,
		writer,
		wallet,
		setActions,
	]);

	return (
		<div className="grow flex flex-col min-h-0">
			<div className="grow min-h-0 flex flex-col">
				<MDX
					markdown={markdown}
					autoFocus
					aspectSquare={false}
					placeholder={writer ? `Write in ${writer.title}` : "Write"}
					onChange={setMarkdown}
					className="bg-transparent text-black dark:text-white h-full flex w-full p-0! create-input-mdx"
				/>
			</div>
		</div>
	);
}
