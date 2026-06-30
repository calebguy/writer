"use client";
import {
	useUnsavedChangesNavigation,
	useUnsavedChangesWarning,
} from "@/hooks/useUnsavedChangesWarning";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { VisuallyHidden } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ModalTitle } from "./dsl/Modal";
import { Check } from "./icons/Check";
import { Close } from "./icons/Close";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

interface WriterTitleEditModalProps {
	open: boolean;
	initialTitle: string;
	isSaving?: boolean;
	onClose: () => void;
	onSave: (title: string) => void | Promise<void>;
}

export function WriterTitleEditModal({
	open,
	initialTitle,
	isSaving = false,
	onClose,
	onSave,
}: WriterTitleEditModalProps) {
	const editorRef = useRef<MDXEditorMethods>(null);
	const [markdown, setMarkdown] = useState(initialTitle);
	const hasUnsavedTitle = markdown !== initialTitle;
	const canSave = markdown.trim() !== "" && hasUnsavedTitle;
	const confirmNavigation = useUnsavedChangesNavigation();
	useUnsavedChangesWarning(
		open && hasUnsavedTitle,
		"Discard this unsaved Place name?",
	);

	const handleClose = useCallback(async () => {
		if (hasUnsavedTitle && !(await confirmNavigation())) return;
		onClose();
	}, [confirmNavigation, hasUnsavedTitle, onClose]);

	useEffect(() => {
		if (!open) return;
		setMarkdown(initialTitle);
		requestAnimationFrame(() => {
			editorRef.current?.setMarkdown(initialTitle);
			editorRef.current?.focus();
		});
	}, [open, initialTitle]);

	useEffect(() => {
		if (!open) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				handleClose();
				return;
			}
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (canSave && !isSaving) void onSave(markdown);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canSave, handleClose, isSaving, markdown, onSave, open]);

	return (
		<Modal
			open={open}
			onClose={handleClose}
			className="w-[min(90vw,420px)] p-4 bg-surface"
		>
			<div className="flex flex-col gap-4 text-center">
				<VisuallyHidden.Root>
					<ModalTitle>Edit Place</ModalTitle>
				</VisuallyHidden.Root>
				<div className="h-56 min-h-0 overflow-hidden rounded-xs border border-dashed border-primary bg-surface text-left">
					<MDX
						ref={editorRef}
						markdown={markdown}
						autoFocus
						aspectSquare={false}
						placeholder="Place title"
						onChange={setMarkdown}
						className="bg-transparent text-black dark:text-white h-full flex w-full p-2! create-input-mdx"
					/>
				</div>
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						aria-label="Cancel title edit"
						onClick={handleClose}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Close className="w-5 h-5" />
					</button>
					<button
						type="button"
						aria-label="Save title"
						disabled={!canSave || isSaving}
						onClick={() => void onSave(markdown)}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-surface rounded-lg w-full flex items-center justify-center"
					>
						{isSaving ? (
							<span className="font-mono text-sm">sign</span>
						) : (
							<Check className="w-5 h-5" />
						)}
					</button>
				</div>
			</div>
		</Modal>
	);
}
