import { useRef } from "react";

import { useState } from "react";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { BlockCreateInput } from "../interfaces";
import { cn } from "../utils/cn";
import { useIsMac } from "../utils/hooks";
import { Editor } from "./Editor";
import { MD } from "./MD";
import { Arrow } from "./icons/Arrow";
import { Blob } from "./icons/Blob";

interface BlockFormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	isLoading?: boolean;
	placeholder?: string;
	canExpand?: boolean;
}

export default function BlockForm({
	placeholder,
	onSubmit,
	isLoading,
	canExpand,
}: BlockFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasFocus, setFocus] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [loadingContent, setLoadingContent] = useState<string | undefined>(
		undefined,
	);
	const toggleExpanded = () => setIsExpanded(!isExpanded);
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current) {
				if (!ref.current.contains(event.target as Node)) {
					setFocus(false);
					setIsExpanded(false);
				} else {
					setFocus(true);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const isLoadingOrSubmitting = isLoading || isSubmitting;

	return (
		<div
			ref={ref}
			className={cn("aspect-square group", {
				"bg-neutral-900": hasFocus,
				"hover:bg-neutral-900 hover:cursor-text bg-transparent border":
					!hasFocus,
				"border-neutral-900": !hasFocus && !isLoadingOrSubmitting,
				"border-0": !hasFocus && isLoadingOrSubmitting,
				"absolute w-full h-full": isExpanded,
				relative: isLoadingOrSubmitting && !isExpanded,
			})}
		>
			{isLoadingOrSubmitting && (
				<div className="absolute inset-0 bg-primary flex flex-col items-center justify-between">
					<div className="text-secondary w-full text-left break-words p-2 overflow-hidden">
						<MD>{loadingContent}</MD>
					</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center text-secondary">
						<Blob className="w-6 h-6 rotating" />
					</div>
				</div>
			)}
			{!isLoadingOrSubmitting && (
				<div
					className={cn(
						"flex justify-center items-center h-full overflow-hidden",
						{
							"items-start justify-start": hasFocus,
							"group-hover:items-start group-hover:justify-start p-2":
								!hasFocus,
						},
					)}
				>
					{!hasFocus && !isExpanded && (
						<>
							<div className="text-2xl text-primary group-hover:hidden">+</div>
							<div className="text-base text-neutral-700 hidden group-hover:block text-left break-words">
								<MD className="pointer-events-none">{placeholder}</MD>
							</div>
						</>
					)}
					{hasFocus && (
						<div className="relative w-full h-full">
							<Form
								onSubmit={async (data) => {
									setLoadingContent(data.value);
									setIsSubmitting(true);
									await onSubmit(data);
									setFocus(false);
									setIsSubmitting(false);
									setIsExpanded(false);
								}}
								onCancel={() => {
									setFocus(false);
									setIsExpanded(false);
								}}
							/>
							{canExpand && !isLoading && (
								<div className="absolute bottom-1 right-1 flex justify-end z-20">
									<button
										type="button"
										className="hover:text-secondary text-primary"
										onClick={toggleExpanded}
									>
										<Arrow
											title="expand"
											className={cn("w-4 h-4", {
												"rotate-90": !isExpanded,
												"-rotate-90": isExpanded,
											})}
										/>
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

interface FormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	onCancel: () => void;
	markdown?: boolean;
}

function Form({ onCancel, onSubmit }: FormProps) {
	const isMac = useIsMac();
	const inputName = "value";
	const { handleSubmit, setFocus, reset, control } =
		useForm<BlockCreateInput>();
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Submit on cmd + enter
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				handleSubmit((data) =>
					onSubmit(data).then(() => {
						reset();
					}),
				)();
			} else if (event.key === "Escape") {
				onCancel();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleSubmit, onSubmit, reset, onCancel]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setFocus(inputName);
		}, 0);
		return () => clearTimeout(timeoutId);
	}, [setFocus]);

	return (
		<form className="w-full h-full relative flex flex-col">
			<Controller
				control={control}
				name={inputName}
				render={({ field }) => (
					<Editor
						// @note TODO possibly support forwarding refs here
						// {...field}
						onChange={(editor) =>
							field.onChange(editor.storage.markdown.getMarkdown())
						}
						className="z-10 overflow-y-auto p-2 focus:border-primary border-dashed border border-transparent"
					/>
				)}
			/>
			<div className="text-neutral-700 text-sm leading-[16px] absolute translate-y-1/2 bottom-1/2 left-1/2 -translate-x-1/2">
				<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
				<div>to create</div>
			</div>
		</form>
	);
}
