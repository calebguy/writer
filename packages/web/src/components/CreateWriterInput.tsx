"use client";

import { useRef, useState, useEffect } from "react";
import { useIsMac } from "@/utils/hooks";
import { cn } from "@/utils/cn";

interface CreateWriterInputProps {
	onSubmit: (title: string) => Promise<unknown>;
	isLoading?: boolean;
	placeholder?: string;
}

export default function CreateWriterInput({
	onSubmit,
	isLoading = false,
	placeholder = "Create a Place",
}: CreateWriterInputProps) {
	const [value, setValue] = useState("");
	const [hasFocus, setHasFocus] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const isMac = useIsMac();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Submit on cmd + enter
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (value.trim()) {
					handleSubmit();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [value]);

	const handleSubmit = async () => {
		if (value.trim() && !isLoading) {
			await onSubmit(value.trim());
			setValue("");
			setHasFocus(false);
		}
	};

	const handleFocus = () => {
		setHasFocus(true);
	};

	const handleBlur = () => {
		setHasFocus(false);
	};

	return (
		<div className="relative w-full h-full">
			<div
				className={cn(
					"w-full h-full border-2 border-dashed border-neutral-700 rounded-lg transition-all duration-200",
					{
						"border-primary bg-neutral-900": hasFocus,
						"hover:border-neutral-600 hover:bg-neutral-900/50": !hasFocus,
					}
				)}
			>
				<div className="relative w-full h-full p-4">
					{!hasFocus && !value && (
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="text-2xl text-neutral-600">+</div>
						</div>
					)}
					
					<textarea
						ref={inputRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onFocus={handleFocus}
						onBlur={handleBlur}
						placeholder={hasFocus ? placeholder : ""}
						className={cn(
							"w-full h-full bg-transparent text-primary placeholder-neutral-600 resize-none outline-none border-none",
							{
								"cursor-text": !hasFocus,
							}
						)}
						disabled={isLoading}
					/>
					
					{hasFocus && (
						<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-neutral-600 text-sm text-center">
							<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
							<div>to create</div>
						</div>
					)}
				</div>
			</div>
			
			{isLoading && (
				<div className="absolute inset-0 bg-neutral-900/90 flex items-center justify-center rounded-lg">
					<div className="text-primary">Creating...</div>
				</div>
			)}
		</div>
	);
} 