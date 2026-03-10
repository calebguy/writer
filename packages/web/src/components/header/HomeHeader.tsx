"use client";

import { type Writer, factoryCreate } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import type { Hex } from "viem";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "../dsl/DynamicDrawer";
import { LogoDropdown } from "../LogoDropdown";

const MDX = dynamic(() => import("../markdown/MDX"), { ssr: false });

export function HomeHeader() {
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

	return (
		<>
		<div className="flex items-center justify-between">
			<div className="text-3xl transition-colors pr-0.5 text-primary">
				Writer
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-label="Create writer"
					onClick={() => setIsCreateSheetOpen(true)}
					className="md:hidden text-primary hover:opacity-80 transition-opacity cursor-pointer p-1"
				>
					<FiPlus className="h-6 w-6" />
				</button>
				<div className="hidden md:block">
					<LogoDropdown />
				</div>
			</div>
		</div>
		<DynamicDrawerRoot
			open={isCreateSheetOpen}
			onOpenChange={setIsCreateSheetOpen}
		>
			<DynamicDrawerContent>
				<DynamicDrawerTitle className="sr-only">
					Create Writer
				</DynamicDrawerTitle>
				<div className="h-56 md:h-64 flex flex-col">
					<MDX
						markdown={markdown}
						autoFocus
						aspectSquare={false}
						placeholder="Create a Place"
						onChange={setMarkdown}
						className="bg-transparent text-black dark:text-white h-full flex w-full p-2 create-input-mdx"
					/>
				</div>
				<div className="mt-3 flex gap-2">
					<button
						type="button"
						onClick={() => {
							void handleCreateWriter();
						}}
						disabled={isPending || !markdown.trim() || !wallet?.address}
						className="w-full h-10 rounded-md bg-primary text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
					>
						{isPending ? "Creating..." : "Create"}
					</button>
				</div>
			</DynamicDrawerContent>
		</DynamicDrawerRoot>
		</>
	);
}
