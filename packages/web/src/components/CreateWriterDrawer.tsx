"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "./dsl/DynamicDrawer";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function CreateWriterDrawer({
	open,
	onOpenChange,
	markdown,
	onMarkdownChange,
	onCreate,
	isDisabled,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	markdown: string;
	onMarkdownChange: (value: string) => void;
	onCreate: () => void;
	isDisabled: boolean;
}) {
	const [drawerTarget, setDrawerTarget] = useState<HTMLDivElement | null>(null);
	const drawerTargetRef = useCallback((node: HTMLDivElement | null) => {
		setDrawerTarget(node);
	}, []);

	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(() => {
			drawerTarget?.querySelector<HTMLElement>("[contenteditable]")?.focus();
		}, 350);
		return () => clearTimeout(timer);
	}, [open, drawerTarget]);

	const editorContent = (
		<>
			<div className="h-56 md:h-64 flex flex-col">
				<MDX
					markdown={markdown}
					autoFocus={false}
					aspectSquare={false}
					placeholder="Create a Place"
					onChange={onMarkdownChange}
					className="bg-transparent text-black dark:text-white h-full flex w-full p-2 create-input-mdx"
				/>
			</div>
			<div className="mt-3 flex gap-2">
				<button
					type="button"
					onClick={onCreate}
					disabled={isDisabled}
					className="w-full h-10 rounded-md bg-surface dark:bg-surface-raised text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
				>
					Create
				</button>
			</div>
		</>
	);

	return (
		<>
			{drawerTarget ? (
				createPortal(editorContent, drawerTarget)
			) : (
				<div className="hidden">{editorContent}</div>
			)}
			<DynamicDrawerRoot open={open} onOpenChange={onOpenChange}>
				<DynamicDrawerContent>
					<DynamicDrawerTitle className="sr-only">
						Create Writer
					</DynamicDrawerTitle>
					<div ref={drawerTargetRef} />
				</DynamicDrawerContent>
			</DynamicDrawerRoot>
		</>
	);
}
