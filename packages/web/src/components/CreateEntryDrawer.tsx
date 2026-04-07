"use client";

import type { CreateInputData } from "@/components/CreateInput";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { useCreateEntryDrawer } from "@/components/writer/CreateEntryDrawerContext";
import { cn } from "@/utils/cn";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "./dsl/DynamicDrawer";
import { LoadingRelic } from "./LoadingRelic";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function CreateEntryDrawer({
	placeholder,
	onSubmit,
	isLoading = false,
}: {
	placeholder?: string;
	onSubmit: (data: CreateInputData) => Promise<void> | void;
	isLoading?: boolean;
}) {
	const { isOpen, setOpen } = useCreateEntryDrawer();
	const [markdown, setMarkdown] = useState("");
	const [encrypted, setEncrypted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [drawerTarget, setDrawerTarget] = useState<HTMLDivElement | null>(null);
	const drawerTargetRef = useCallback((node: HTMLDivElement | null) => {
		setDrawerTarget(node);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const timer = setTimeout(() => {
			drawerTarget?.querySelector<HTMLElement>("[contenteditable]")?.focus();
		}, 350);
		return () => clearTimeout(timer);
	}, [isOpen, drawerTarget]);

	const handleReset = () => {
		setMarkdown("");
		setEncrypted(false);
		setOpen(false);
	};

	const handleSubmit = async () => {
		if (!markdown.trim() || isLoading || isSubmitting) return;
		setIsSubmitting(true);
		await onSubmit({ markdown, encrypted });
		setIsSubmitting(false);
		handleReset();
	};

	const editorContent = (
		<>
			<div className="h-56 flex flex-col">
				<MDX
					markdown={markdown}
					autoFocus={false}
					aspectSquare={false}
					placeholder={placeholder}
					onChange={setMarkdown}
					className="bg-transparent text-black dark:text-white h-full flex w-full p-2 create-input-mdx"
				/>
			</div>
			<div className="mt-2 flex justify-end">
				<button
					type="button"
					onClick={() => setEncrypted(!encrypted)}
					className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer"
				>
					{encrypted ? (
						<Lock className="h-4 w-4" />
					) : (
						<Unlock className="h-4 w-4" />
					)}
				</button>
			</div>
			<div className="mt-1">
				<button
					type="button"
					onClick={() => void handleSubmit()}
					disabled={!markdown.trim()}
					className={cn(
						"w-full h-10 rounded-md bg-surface dark:bg-surface-raised text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
					)}
				>
					Create
				</button>
			</div>
		</>
	);

	return (
		<>
			{/* Always-mounted editor: portaled into drawer when open, hidden otherwise */}
			{drawerTarget ? (
				createPortal(editorContent, drawerTarget)
			) : (
				<div className="hidden">{editorContent}</div>
			)}
			<DynamicDrawerRoot
				open={isOpen}
				onOpenChange={(open) => {
					setOpen(open);
					if (!open) {
						setMarkdown("");
						setEncrypted(false);
					}
				}}
			>
				<DynamicDrawerContent loading={isLoading || isSubmitting}>
					<DynamicDrawerTitle className="sr-only">
						Create Entry
					</DynamicDrawerTitle>
					{isLoading || isSubmitting ? (
						<div className="h-56 flex items-center justify-center">
							<LoadingRelic size={32} className="bg-secondary!" />
						</div>
					) : (
						<div ref={drawerTargetRef} />
					)}
				</DynamicDrawerContent>
			</DynamicDrawerRoot>
		</>
	);
}
