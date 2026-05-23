"use client";

import { Arrow } from "@/components/icons/Arrow";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { cn } from "@/utils/cn";
import { useIsMac } from "@/utils/hooks";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingRelic } from "./LoadingRelic";
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
}

export default function CreateInput({
	placeholder,
	placeholderMarkdown,
	onExpand,
	onSubmit,
	canExpand = false,
	isLoading = false,
}: CreateInputProps) {
	const isMac = useIsMac();
	const [hasFocus, setHasFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const editorRef = useRef<MDXEditorMethods>(null);
	const editorShellRef = useRef<HTMLDivElement>(null);
	const hintRef = useRef<HTMLDivElement>(null);
	const [showHint, setShowHint] = useState(true);
	const [loadingContent, setLoadingContent] = useState<string>("");
	const [encrypted, setEncrypted] = useState(false);

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

	// Focus the editor when hasFocus changes to true
	useEffect(() => {
		if (hasFocus && editorRef.current) {
			// Small timeout to ensure the editor is rendered
			setTimeout(() => {
				editorRef.current?.focus();
			}, 0);
		}
	}, [hasFocus]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Submit on cmd/ctrl + enter
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (markdown.trim() !== "") {
					handleSubmit();
				}
			} else if (event.key === "Escape") {
				handleReset();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [markdown, encrypted, onSubmit, onExpand]);

	const updateHintVisibility = useCallback(() => {
		if (!markdown.trim()) {
			setShowHint(true);
			return;
		}

		const shell = editorShellRef.current;
		const hint = hintRef.current;
		if (!shell || !hint) {
			setShowHint(true);
			return;
		}

		const content = shell.querySelector<HTMLElement>(".prose");
		if (!content) {
			setShowHint(true);
			return;
		}

		const hintRect = hint.getBoundingClientRect();
		const textRects: DOMRect[] = [];
		const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node) {
			if (node.textContent?.trim()) {
				const range = document.createRange();
				range.selectNodeContents(node);
				for (const rect of Array.from(range.getClientRects())) {
					if (rect.width > 0 && rect.height > 0) {
						textRects.push(rect);
					}
				}
				range.detach();
			}
			node = walker.nextNode();
		}
		const overlapsHint = textRects.some(
			(rect) =>
				rect.left < hintRect.right &&
				rect.right > hintRect.left &&
				rect.top < hintRect.bottom &&
				rect.bottom > hintRect.top,
		);
		setShowHint(!overlapsHint);
	}, [markdown]);

	useEffect(() => {
		const frame = requestAnimationFrame(updateHintVisibility);
		return () => cancelAnimationFrame(frame);
	}, [updateHintVisibility]);

	useEffect(() => {
		if (!hasFocus && !isExpanded) return;
		window.addEventListener("resize", updateHintVisibility);
		return () => window.removeEventListener("resize", updateHintVisibility);
	}, [hasFocus, isExpanded, updateHintVisibility]);

	const handleReset = () => {
		editorRef.current?.setMarkdown("");
		setMarkdown("");
		setHasFocus(false);
		setIsExpanded(false);
		setEncrypted(false);
		onExpand?.(false);
	};

	const handleSubmit = () => {
		if (markdown.trim() === "") return;
		if (isLoading) return;
		const data = { markdown, encrypted };
		// Optimistically clear the editor — restore on failure.
		const prevMarkdown = markdown;
		const prevEncrypted = encrypted;
		setLoadingContent(markdown);
		editorRef.current?.setMarkdown("");
		setMarkdown("");
		setHasFocus(false);
		setIsExpanded(false);
		setEncrypted(false);
		onExpand?.(false);
		Promise.resolve(onSubmit(data)).catch((err) => {
			console.error("Submit failed:", err);
			// Restore the content so the user can retry
			editorRef.current?.setMarkdown(prevMarkdown);
			setMarkdown(prevMarkdown);
			setEncrypted(prevEncrypted);
			setHasFocus(true);
		});
	};

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
						hidden: hasFocus || isExpanded,
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
				ref={editorShellRef}
				className={cn("h-full relative min-h-0 overflow-hidden rounded-xs", {
					hidden: !hasFocus && !isExpanded,
					flex: hasFocus || isExpanded,
					"border border-dashed border-primary w-full": hasFocus || isExpanded,
				})}
			>
				<MDX
					ref={editorRef}
					markdown={markdown}
					autoFocus
					className={cn(
						"bg-surface text-black dark:text-white flex-col placeholder:text-green-300 h-full flex w-full p-2 create-input-mdx",
					)}
					placeholder={placeholderMarkdown ?? placeholder}
					renderPlaceholderAsMarkdown={!!placeholderMarkdown}
					onChange={setMarkdown}
				/>
				<div
					ref={hintRef}
					aria-hidden="true"
					className={cn(
						"create-input-hint text-neutral-700 text-base leading-[16px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity",
						showHint ? "opacity-100" : "opacity-0",
					)}
				>
					<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
					<div>to create</div>
				</div>
				{hasFocus && canExpand && (
					<div className="absolute bottom-1 flex justify-between w-full z-20 px-2 pb-0.5">
						<button
							type="button"
							onClick={() => setEncrypted?.(!encrypted)}
							className="create-input-control hover:text-primary text-neutral-400 dark:text-neutral-600 cursor-pointer"
						>
							{encrypted ? (
								<Lock className="h-3.5 w-3.5" />
							) : (
								<Unlock className="h-3.5 w-3.5 ml-0.5" />
							)}
						</button>
						<button
							type="button"
							className="create-input-control hover:text-primary text-neutral-400 dark:text-neutral-600 mt-1 cursor-pointer"
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
			</div>
		</div>
	);
}
