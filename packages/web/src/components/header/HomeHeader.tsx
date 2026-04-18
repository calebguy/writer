"use client";

import { type Writer, factoryCreate } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import type { Hex } from "viem";
import { CreateWriterDrawer } from "../CreateWriterDrawer";
import { NavDropdown } from "../NavDropdown";

export function HomeHeader() {
	const { authenticated, getAccessToken } = usePrivy();
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [markdown, setMarkdown] = useState("");

	const { mutateAsync, isPending } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory-header"],
		onMutate: async (vars) => {
			// Optimistic placeholder — same pattern as WriterList. The real
			// deterministic address isn't known until the server computes
			// it from salt, so we key on a sentinel; onSettled's refetch
			// replaces this row with the server-overlay row (which carries
			// the real address and survives until the indexer confirms).
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

			// Snapshot all current get-writers caches before mutating so onError
			// can restore them. We snapshot separately from the update call
			// because TanStack's `setQueriesData` updater only receives the
			// old value, not the query itself.
			const snapshots = queryClient.getQueriesData<Writer[]>({
				queryKey: ["get-writers"],
			});
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

	useEffect(() => {
		if (!isCreateSheetOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === "Enter" &&
				(event.metaKey || event.ctrlKey) &&
				!isPending
			) {
				event.preventDefault();
				void handleCreateWriter();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [isCreateSheetOpen, isPending, markdown, wallet?.address]);

	const handleCreateWriter = async () => {
		const title = markdown.trim();
		if (!title || !wallet?.address) {
			return;
		}
		// Close + clear immediately so the user sees the optimistic
		// writer card on the page below. The mutation runs in the
		// background — onMutate already inserted the pending row.
		setMarkdown("");
		setIsCreateSheetOpen(false);
		const walletAddress = wallet.address;
		const authToken = await getAccessToken();
		if (!authToken) {
			console.error("No auth token found");
			return;
		}
		mutateAsync({
			title,
			admin: walletAddress as Hex,
			managers: [walletAddress as Hex],
			authToken,
		}).catch((err) => {
			console.error("Create writer failed:", err);
		});
	};

	const handleOpenChange = (open: boolean) => {
		setIsCreateSheetOpen(open);
		if (!open) {
			setMarkdown("");
		}
	};

	return (
		<>
			<div className="flex items-center justify-between">
				{authenticated ? (
					<div className="text-3xl transition-colors pr-0.5 text-primary">
						Writer
					</div>
				) : (
					<Link href="/" className="text-3xl transition-colors pr-0.5 text-primary">
						Writer
					</Link>
				)}
				<div className="flex items-center gap-2">
					{authenticated && (
						<button
							type="button"
							aria-label="Create writer"
							onClick={() => setIsCreateSheetOpen(true)}
							className="md:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
						>
							<FiPlus className="h-6 w-6" />
						</button>
					)}
					<div className="hidden md:block">
						<NavDropdown />
					</div>
				</div>
			</div>
			<CreateWriterDrawer
				open={isCreateSheetOpen}
				onOpenChange={handleOpenChange}
				markdown={markdown}
				onMarkdownChange={setMarkdown}
				onCreate={() => {
					void handleCreateWriter();
				}}
				isDisabled={isPending || !markdown.trim() || !wallet?.address}
			/>
		</>
	);
}
