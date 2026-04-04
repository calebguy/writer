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
	const { authenticated } = usePrivy();
	const queryClient = useQueryClient();
	const [wallet] = useOPWallet();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const [markdown, setMarkdown] = useState("");

	const { mutateAsync, isPending } = useMutation({
		mutationFn: factoryCreate,
		mutationKey: ["create-from-factory-header"],
		onSuccess: ({ writer }) => {
			queryClient.setQueriesData<Writer[]>(
				{ queryKey: ["get-writers"] },
				(prev) => {
					const nextWriter = { ...writer, entries: [] };
					if (!prev) return [nextWriter];
					if (
						prev.some(
							(existing) =>
								existing.address.toLowerCase() === writer.address.toLowerCase(),
						)
					) {
						return prev;
					}
					return [nextWriter, ...prev];
				},
			);
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
		if (!title || !wallet?.address || isPending) {
			return;
		}

		await mutateAsync({
			title,
			admin: wallet.address as Hex,
			managers: [wallet.address as Hex],
		});

		setMarkdown("");
		setIsCreateSheetOpen(false);
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
					<button
						type="button"
						aria-label="Create writer"
						onClick={() => setIsCreateSheetOpen(true)}
						className="md:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer"
					>
						<FiPlus className="h-6 w-6" />
					</button>
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
				isPending={isPending}
				isDisabled={isPending || !markdown.trim() || !wallet?.address}
			/>
		</>
	);
}
