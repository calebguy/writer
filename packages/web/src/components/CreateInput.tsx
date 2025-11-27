"use client";

import { Arrow } from "@/components/icons/Arrow";
import { Blob } from "@/components/icons/Blob";
import { cn } from "@/utils/cn";
import { useIsMac } from "@/utils/hooks";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

interface CreateInputProps {
	placeholder?: string;
	onExpand?: (isExpanded: boolean) => void;
	canExpand?: boolean;
	onSubmit: (markdown: string) => Promise<void> | void;
	isLoading?: boolean;
}

export default function CreateInput({
	placeholder,
	onExpand,
	canExpand = false,
	onSubmit,
	isLoading = false,
}: CreateInputProps) {
	const isMac = useIsMac();
	const [hasFocus, setHasFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const editorRef = useRef<MDXEditorMethods>(null);
	const [showHint, setShowHint] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [loadingContent, setLoadingContent] = useState<string>("");

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
		const handleKeyDown = async (event: KeyboardEvent) => {
			console.log("handleKeyDown", event);
			// Submit on cmd/ctrl + enter
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (markdown.trim() !== "") {
					setLoadingContent(markdown);
					setIsSubmitting(true);
					await onSubmit(markdown);
					editorRef.current?.setMarkdown("");
					setMarkdown("");
					setIsSubmitting(false);
					setHasFocus(false);
					setIsExpanded(false);
					onExpand?.(false);
				}
			} else if (event.key === "Escape") {
				editorRef.current?.setMarkdown("");
				setMarkdown("");
				setHasFocus(false);
				setIsExpanded(false);
				onExpand?.(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [markdown, onSubmit, onExpand]);

	// Hide hint when text would overlap (based on character count as a heuristic)
	useEffect(() => {
		const lineCount = markdown.split("\n").length;
		const hasSignificantContent = markdown.length > 50 || lineCount > 5;
		setShowHint(!hasSignificantContent);
	}, [markdown]);

	const isLoadingOrSubmitting = isLoading || isSubmitting;

	return (
		<div
			className={cn("group", {
				"aspect-square relative": !isExpanded,
				"absolute inset-0 z-50": isExpanded,
			})}
			ref={containerRef}
		>
			{isLoadingOrSubmitting && (
				<div className="absolute inset-0 bg-secondary flex flex-col items-center justify-between h-full">
					<div className="text-primary w-full text-left break-words p-2 overflow-hidden">
						<MarkdownRenderer markdown={loadingContent} />
					</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center text-primary">
						<Blob
							className={cn("rotating", {
								"w-6 h-6": !isExpanded,
								"w-8 h-8": isExpanded,
							})}
						/>
					</div>
				</div>
			)}
			{!isLoadingOrSubmitting && (
				<>
					<div
						className={cn(
							"border border-neutral-900 h-full flex justify-center items-center text-primary text-2xl bg-transparent hover:bg-neutral-900 hover:cursor-text transition-colors",
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
						className={cn("h-full relative", {
							hidden: !hasFocus && !isExpanded,
							flex: hasFocus || isExpanded,
							"border border-dashed border-primary w-full": isExpanded,
						})}
					>
						<MDX
							ref={editorRef}
							markdown={markdown}
							autoFocus
							className={cn(
								"bg-neutral-900 !text-white flex-col placeholder:text-green-300 h-full flex w-full p-2",
								{
									"border-dashed border-primary": hasFocus && !isExpanded,
								},
							)}
							placeholder={placeholder}
							onChange={setMarkdown}
						/>
						{showHint && (
							<div className="text-neutral-700 text-base leading-[16px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
								<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
								<div>to create</div>
							</div>
						)}
						{hasFocus && canExpand && (
							<button
								type="button"
								className="absolute bottom-2 right-2 hover:text-primary text-neutral-600 z-20 cursor-pointer"
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
						)}
					</div>
				</>
			)}
		</div>
	);
}
