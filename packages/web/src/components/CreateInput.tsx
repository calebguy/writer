"use client";

import { Arrow } from "@/components/icons/Arrow";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { cn } from "@/utils/cn";
import { useIsMac, useIsMobile } from "@/utils/hooks";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./icons/Logo";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export interface CreateInputData {
	markdown: string;
	encrypted: boolean;
}

interface CreateInputProps {
	placeholder?: string;
	onExpand?: (isExpanded: boolean) => void;
	canExpand?: boolean;
	onSubmit: (data: CreateInputData) => Promise<void> | void;
	isLoading?: boolean;
}

export default function CreateInput({
	placeholder,
	onExpand,
	onSubmit,
	canExpand = false,
	isLoading = false,
}: CreateInputProps) {
	const isMac = useIsMac();
	const isMobile = useIsMobile();
	const [hasFocus, setHasFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const editorRef = useRef<MDXEditorMethods>(null);
	const [showHint, setShowHint] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
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
		const handleKeyDown = async (event: KeyboardEvent) => {
			// Submit on cmd/ctrl + enter
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (markdown.trim() !== "") {
					setLoadingContent(markdown);
					setIsSubmitting(true);
					await onSubmit({ markdown, encrypted });
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
	}, [markdown, encrypted, onSubmit, onExpand]);

	// Hide hint when text would overlap (based on character count as a heuristic)
	useEffect(() => {
		const lineCount = markdown.split("\n").length;
		const hasSignificantContent = markdown.length > 50 || lineCount > 5;
		setShowHint(!hasSignificantContent);
	}, [markdown]);

	// Mobile submit handler
	const handleMobileSubmit = async () => {
		if (markdown.trim() !== "") {
			setLoadingContent(markdown);
			setIsSubmitting(true);
			await onSubmit({ markdown, encrypted });
			editorRef.current?.setMarkdown("");
			setMarkdown("");
			setIsSubmitting(false);
			setHasFocus(false);
			setIsExpanded(false);
			onExpand?.(false);
		}
	};

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
						<Logo
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
								"bg-neutral-900 text-white! flex-col placeholder:text-green-300 h-full flex w-full p-2",
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
						{hasFocus && canExpand && !isLoading && (
							<div className="absolute bottom-1 flex justify-between w-full z-20 px-2 pb-0.5">
								<button
									type="button"
									onClick={() => setEncrypted?.(!encrypted)}
									className="hover:text-primary text-neutral-600 cursor-pointer"
								>
									{encrypted ? (
										<Lock className="h-3.5 w-3.5" />
									) : (
										<Unlock className="h-3.5 w-3.5 ml-0.5" />
									)}
								</button>
								<button
									type="button"
									className="hover:text-primary text-neutral-600 mt-1 cursor-pointer"
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
				</>
			)}
			{isMobile && hasFocus && markdown.trim() !== "" && (
				<div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm border-t border-neutral-800 z-50">
					<button
						type="button"
						onClick={handleMobileSubmit}
						disabled={isSubmitting}
						className="w-full py-3 px-4 bg-primary text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
					>
						{isSubmitting ? "Creating..." : "Create Writer"}
					</button>
				</div>
			)}
		</div>
	);
}
