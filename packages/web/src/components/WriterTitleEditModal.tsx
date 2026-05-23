"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { VisuallyHidden } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { MAX_TITLE_LENGTH } from "utils/constants";
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
	const canSave = markdown.trim() !== "" && markdown !== initialTitle;

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
				onClose();
				return;
			}
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (canSave && !isSaving) void onSave(markdown);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canSave, isSaving, markdown, onClose, onSave, open]);

	return (
		<Modal
			open={open}
			onClose={onClose}
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
						maxLength={MAX_TITLE_LENGTH}
						className="bg-transparent text-black dark:text-white h-full flex w-full p-2! create-input-mdx"
					/>
				</div>
				<div className="flex items-center justify-center gap-2">
					<button
						type="button"
						aria-label="Cancel title edit"
						onClick={onClose}
						className="px-4 py-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer bg-surface rounded-lg w-full flex items-center justify-center"
					>
						<Close className="w-5 h-5" />
					</button>
					<button
						type="button"
						aria-label="Save title"
						disabled={
							!canSave || isSaving || markdown.length > MAX_TITLE_LENGTH
						}
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
