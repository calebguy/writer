"use client";

import { Arrow } from "@/components/icons/Arrow";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { useEncryptedDraftAutosave } from "@/hooks/useEncryptedDraftAutosave";
import {
	useUnsavedChangesNavigation,
	useUnsavedChangesWarning,
} from "@/hooks/useUnsavedChangesWarning";
import { cn } from "@/utils/cn";
import { isAutoSavedDraftId } from "@/utils/encryptedDrafts";
import { useIsMac } from "@/utils/hooks";
import { isEscapeKey, isPrimaryEnterShortcut } from "@/utils/keyboardShortcuts";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingRelic } from "./LoadingRelic";
import { MarkdownHelpLink } from "./markdown/MarkdownGuide";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export interface CreateInputData {
	markdown: string;
	encrypted: boolean;
}

interface CreateInputProps {
	placeholder?: string;
	placeholderMarkdown?: string;
	onExpand?: (isExpanded: boolean) => void;
	canExpand?: boolean;
	onSubmit: (data: CreateInputData) => Promise<void> | void;
	// Only shown while waiting on an external-wallet signature prompt.
	// Embedded-wallet flows should leave this false so submission feels instant.
	isLoading?: boolean;
	initialMarkdown?: string;
	forceOpen?: boolean;
	submitLabel?: string;
	onCancel?: () => void;
	hidePrivacyControls?: boolean;
	unsavedChangesTitle?: string;
	draftId?: string;
}

export default function CreateInput({
	placeholder,
	placeholderMarkdown,
	onExpand,
	onSubmit,
	canExpand = false,
	isLoading = false,
	initialMarkdown,
	forceOpen = false,
	submitLabel,
	onCancel,
	hidePrivacyControls = false,
	unsavedChangesTitle,
	draftId,
}: CreateInputProps) {
	const isMac = useIsMac();
	const [hasFocus, setHasFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const editorRef = useRef<MDXEditorMethods>(null);
	const [loadingContent, setLoadingContent] = useState<string>("");
	const [encrypted, setEncrypted] = useState(false);
	const hasUnsavedChanges = forceOpen
		? markdown !== (initialMarkdown ?? "")
		: markdown.trim() !== "";
	const confirmNavigation = useUnsavedChangesNavigation();
	const restoreDraft = useCallback((draft: CreateInputData) => {
		editorRef.current?.setMarkdown(draft.markdown);
		setMarkdown(draft.markdown);
		setEncrypted(draft.encrypted);
		setHasFocus(true);
	}, []);
	const { clearDraft, saveDraft } = useEncryptedDraftAutosave({
		draftId,
		markdown,
		encrypted,
		onRestore: restoreDraft,
	});
	const unsavedChangesPrompt = useMemo(() => {
		if (!isAutoSavedDraftId(draftId)) return unsavedChangesTitle;
		return {
			title: "Draft autosave",
			onConfirm: saveDraft,
			autoConfirm: true,
		};
	}, [draftId, saveDraft, unsavedChangesTitle]);
	useUnsavedChangesWarning(hasUnsavedChanges, unsavedChangesPrompt);

	const submitVerb = submitLabel ?? "create";
	// Handle clicks inside or outside the container
	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (containerRef.current) {
				if (!containerRef.current.contains(event.target as Node)) {
					if (markdown.trim() === "") {
						setHasFocus(false);
						setIsExpanded(false);
						onExpand?.(false);
					}
				}
			}
		};

		document.addEventListener("mousedown", handleClick);
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, [markdown, onExpand]);

	useEffect(() => {
		if (!forceOpen) return;
		setMarkdown(initialMarkdown ?? "");
		editorRef.current?.setMarkdown(initialMarkdown ?? "");
		setHasFocus(true);
		setIsExpanded(false);
	}, [forceOpen, initialMarkdown]);

	// Focus the editor when hasFocus changes to true
	useEffect(() => {
		if (hasFocus && editorRef.current) {
			// Small timeout to ensure the editor is rendered
			setTimeout(() => {
				editorRef.current?.focus();
			}, 0);
		}
	}, [hasFocus]);

	const handleReset = useCallback(async () => {
		if (hasUnsavedChanges && !(await confirmNavigation(unsavedChangesTitle)))
			return;

		const resetMarkdown = forceOpen ? initialMarkdown ?? "" : "";
		editorRef.current?.setMarkdown(resetMarkdown);
		setMarkdown(resetMarkdown);
		setHasFocus(Boolean(forceOpen));
		setIsExpanded(false);
		setEncrypted(false);
		await clearDraft();
		onExpand?.(false);
		onCancel?.();
	}, [
		clearDraft,
		confirmNavigation,
		forceOpen,
		hasUnsavedChanges,
		initialMarkdown,
		onCancel,
		onExpand,
		unsavedChangesTitle,
	]);

	const handleSubmit = useCallback(() => {
		if (markdown.trim() === "") return;
		if (isLoading) return;
		const data = { markdown, encrypted };
		// Optimistically clear the editor — restore on failure.
		const prevMarkdown = markdown;
		const prevEncrypted = encrypted;
		setLoadingContent(markdown);
		editorRef.current?.setMarkdown(forceOpen ? prevMarkdown : "");
		setMarkdown(forceOpen ? prevMarkdown : "");
		setHasFocus(Boolean(forceOpen));
		setIsExpanded(false);
		setEncrypted(false);
		onExpand?.(false);
		Promise.resolve(onSubmit(data))
			.then(() => clearDraft())
			.catch((err) => {
				console.error("Submit failed:", err);
				// Restore the content so the user can retry
				editorRef.current?.setMarkdown(prevMarkdown);
				setMarkdown(prevMarkdown);
				setEncrypted(prevEncrypted);
				setHasFocus(true);
			});
	}, [
		clearDraft,
		encrypted,
		forceOpen,
		isLoading,
		markdown,
		onExpand,
		onSubmit,
	]);

	// Handle keyboard shortcuts. The submit shortcut runs in capture phase so
	// Lexical never sees Cmd/Ctrl+Enter as a plain Enter and inserts a newline.
	useEffect(() => {
		const handleSubmitShortcut = (event: KeyboardEvent) => {
			if (!hasFocus && !isExpanded && !forceOpen) return;
			if (!isPrimaryEnterShortcut(event)) return;

			event.preventDefault();
			event.stopPropagation();
			handleSubmit();
		};

		document.addEventListener("keydown", handleSubmitShortcut, {
			capture: true,
		});
		return () => {
			document.removeEventListener("keydown", handleSubmitShortcut, {
				capture: true,
			});
		};
	}, [forceOpen, handleSubmit, hasFocus, isExpanded]);

	useEffect(() => {
		const handleEscapeKeyDown = (event: KeyboardEvent) => {
			if (!hasFocus && !isExpanded && !forceOpen) return;
			if (!isEscapeKey(event)) return;

			event.preventDefault();
			handleReset();
		};

		document.addEventListener("keydown", handleEscapeKeyDown);
		return () => {
			document.removeEventListener("keydown", handleEscapeKeyDown);
		};
	}, [forceOpen, handleReset, hasFocus, isExpanded]);

	const showHint = markdown.trim() === "";

	return (
		<div
			className={cn("group", {
				"aspect-square relative": !isExpanded,
				"absolute inset-0 z-50": isExpanded,
			})}
			ref={containerRef}
		>
			{isLoading && (
				<div className="absolute inset-0 z-30 bg-secondary border border-secondary flex flex-col items-center justify-between h-full">
					<div className="text-primary w-full text-left wrap-break-word p-2 overflow-hidden rounded-xs">
						<MarkdownRenderer
							markdown={loadingContent}
							className="create-input-loading-text"
						/>
					</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center text-primary">
						<LoadingRelic size={isExpanded ? 32 : 24} />
					</div>
				</div>
			)}
			<div
				className={cn(
					"border border-surface h-full flex justify-center items-center text-primary text-2xl bg-background hover:bg-surface hover:cursor-text rounded-xs",
					{
						hidden: forceOpen || hasFocus || isExpanded,
					},
				)}
				onClick={() => setHasFocus(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setHasFocus(true);
					}
				}}
			>
				<span>+</span>
			</div>
			<div
				className={cn("h-full relative min-h-0 overflow-hidden rounded-xs", {
					hidden: !forceOpen && !hasFocus && !isExpanded,
					flex: forceOpen || hasFocus || isExpanded,
					"border border-dashed border-primary w-full":
						forceOpen || hasFocus || isExpanded,
				})}
			>
				<MDX
					ref={editorRef}
					markdown={markdown}
					autoFocus
					className={cn(
						"bg-surface text-foreground flex-col placeholder:text-muted h-full flex w-full p-2 create-input-mdx",
					)}
					placeholder={placeholderMarkdown ?? placeholder}
					renderPlaceholderAsMarkdown={!!placeholderMarkdown}
					onChange={setMarkdown}
				/>
				<div
					aria-hidden="true"
					className={cn(
						"create-input-hint text-muted text-base leading-[16px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity",
						showHint ? "opacity-100" : "opacity-0",
					)}
				>
					<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
					<div>to {submitVerb}</div>
				</div>
				{hasFocus && canExpand && !hidePrivacyControls && (
					<div className="create-input-toolbar absolute inset-x-0 bottom-0 z-20 grid h-11 grid-cols-[1fr_auto_1fr] items-end px-2 pb-1.5 pt-4">
						<button
							type="button"
							aria-label={
								encrypted ? "Make entry public" : "Make entry private"
							}
							onClick={() => setEncrypted?.(!encrypted)}
							className="create-input-control justify-self-start text-muted hover:text-primary cursor-pointer"
						>
							{encrypted ? (
								<Lock className="h-3.5 w-3.5" />
							) : (
								<Unlock className="h-3.5 w-3.5 ml-0.5" />
							)}
						</button>
						<MarkdownHelpLink className="justify-self-center pb-0.5" />
						<button
							type="button"
							aria-label={isExpanded ? "Collapse editor" : "Expand editor"}
							className="create-input-control justify-self-end text-muted hover:text-primary cursor-pointer"
							onClick={() => {
								setIsExpanded(!isExpanded);
								onExpand?.(!isExpanded);
							}}
							onMouseDown={(e) => {
								e.preventDefault();
							}}
						>
							<Arrow
								title={isExpanded ? "collapse" : "expand"}
								className={cn("w-4 h-4", {
									"rotate-90": !isExpanded,
									"-rotate-90": isExpanded,
								})}
							/>
						</button>
					</div>
				)}
				{(forceOpen || hasFocus || isExpanded) &&
					(!hasFocus || !canExpand || hidePrivacyControls) && (
						<MarkdownHelpLink className="create-input-floating-help absolute right-2 bottom-2 z-20" />
					)}
			</div>
		</div>
	);
}
