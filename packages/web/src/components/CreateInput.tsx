"use client";

import { Arrow } from "@/components/icons/Arrow";
import { cn } from "@/utils/cn";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

interface CreateInputProps {
	placeholder?: string;
	onExpand?: (isExpanded: boolean) => void;
	canExpand?: boolean;
}

export default function CreateInput({
	placeholder,
	onExpand,
	canExpand = false,
}: CreateInputProps) {
	const [hasFocus, setHasFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [markdown, setMarkdown] = useState<string>("");
	const editorRef = useRef<MDXEditorMethods>(null);

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

	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				editorRef.current?.setMarkdown("");
				setHasFocus(false);
				setIsExpanded(false);
				onExpand?.(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onExpand]);

	if (isExpanded) {
		return (
			<div
				className="absolute inset-0 z-50 bg-neutral-900"
				ref={containerRef}
			>
				<div className="h-full w-full border border-dashed border-primary relative">
					<MDX
						ref={editorRef}
						markdown={markdown}
						autoFocus
						className="bg-neutral-900 text-white!important flex-col placeholder:text-green-300 h-full flex w-full p-2"
						placeholder={placeholder}
						onChange={setMarkdown}
					/>
					<button
						type="button"
						className="absolute bottom-3 right-2 hover:text-primary text-neutral-600 z-20"
						onClick={() => {
							setIsExpanded(false);
							onExpand?.(false);
						}}
						onMouseDown={(e) => {
							e.preventDefault();
						}}
					>
						<Arrow title="collapse" className="-rotate-90 w-4 h-4" />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="group aspect-square" ref={containerRef}>
			<div
				className={cn(
					"border border-neutral-900 h-full flex justify-center items-center text-primary text-2xl bg-transparent hover:bg-neutral-900 hover:cursor-text transition-colors",
					{
						hidden: hasFocus,
					},
				)}
				onClick={() => setHasFocus(true)}
			>
				<span>+</span>
			</div>
			<div
				className={cn("h-full relative", {
					hidden: !hasFocus,
					flex: hasFocus,
				})}
			>
				<MDX
					ref={editorRef}
					markdown={markdown}
					autoFocus
					className="border-dashed bg-neutral-900 text-white!important flex-col placeholder:text-green-300 h-full flex border-primary"
					placeholder={placeholder}
					onChange={setMarkdown}
				/>
				{hasFocus && canExpand && (
					<button
						type="button"
						className="absolute bottom-3 right-2 hover:text-primary text-neutral-600 z-20"
						onClick={() => {
							setIsExpanded(true);
							onExpand?.(true);
						}}
						onMouseDown={(e) => {
							e.preventDefault();
						}}
					>
						<Arrow title="expand" className="rotate-90 w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
