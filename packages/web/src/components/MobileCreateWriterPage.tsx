"use client";

import { Check } from "@/components/icons/Check";
import { Close } from "@/components/icons/Close";
import { type Writer, factoryCreate } from "@/utils/api";
import { cn } from "@/utils/cn";
import { useOPWallet } from "@/utils/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Hex } from "viem";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function MobileCreateWriterPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { getAccessToken } = usePrivy();
	const [wallet] = useOPWallet();
	const [markdown, setMarkdown] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { mutate } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory"],
		onMutate: async (vars) => {
			const snapshots = queryClient.getQueriesData<Writer[]>({
				queryKey: ["get-writers"],
			});
			const tempAddress = `pending-${Date.now()}`;
			const now = new Date();
			const optimistic = {
				address: tempAddress,
				storageAddress: tempAddress,
				storageId: tempAddress,
				publicWritable: false,
				legacyDomain: false,
				title: vars.title,
				admin: String(vars.admin),
				managers: (vars.managers as string[]).map(String),
				createdAtHash: null,
				createdAtBlock: undefined,
				createdAtBlockDatetime: null,
				createdAt: now,
				updatedAt: now,
				deletedAt: null,
				transactionId: null,
				entries: [],
			} as unknown as Writer;

			queryClient.setQueriesData<Writer[]>(
				{ queryKey: ["get-writers"] },
				(prev) => (prev ? [optimistic, ...prev] : [optimistic]),
			);
			return { snapshots };
		},
		onError: (_err, _vars, ctx) => {
			for (const [queryKey, previous] of ctx?.snapshots ?? []) {
				queryClient.setQueryData(queryKey, previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["get-writers"] });
		},
	});

	const handleExit = () => {
		router.push("/home");
	};

	const handleCreate = async () => {
		const title = markdown.trim();
		if (!title || !wallet?.address || isSubmitting) return;
		setIsSubmitting(true);
		const authToken = await getAccessToken();
		if (!authToken) {
			console.error("No auth token found");
			setIsSubmitting(false);
			return;
		}

		const walletAddress = wallet.address;
		mutate(
			{
				title,
				admin: walletAddress as Hex,
				managers: [walletAddress as Hex],
				authToken,
			},
			{
				onError: (err) => {
					console.error("Create writer failed:", err);
				},
			},
		);
		router.push("/home");
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
	}, [markdown, wallet?.address, isSubmitting]);

	return (
		<div className="grow flex flex-col min-h-0">
			<div className="flex items-center justify-between mb-4 shrink-0">
				<button
					type="button"
					aria-label="Exit"
					onClick={handleExit}
					className="text-primary hover:text-secondary transition-colors cursor-pointer"
				>
					<Close className="w-7 h-7" />
				</button>
				<button
					type="button"
					aria-label="Create Place"
					onClick={() => void handleCreate()}
					disabled={!markdown.trim() || !wallet?.address || isSubmitting}
					className={cn(
						"text-primary hover:text-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
					)}
				>
					<Check className="w-7 h-7" />
				</button>
			</div>
			<div className="grow min-h-0 flex flex-col rounded-xs border border-dashed border-primary bg-surface overflow-hidden">
				<MDX
					markdown={markdown}
					autoFocus
					aspectSquare={false}
					placeholder="Create a Place"
					onChange={setMarkdown}
					className="bg-transparent text-black dark:text-white h-full flex w-full p-2! create-input-mdx"
				/>
			</div>
		</div>
	);
}
