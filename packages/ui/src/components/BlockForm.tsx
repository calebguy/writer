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
	return (
		<div
			ref={ref}
			className={cn("aspect-square border border-neutral-900 group", {
				"bg-neutral-900": hasFocus,
				"hover:bg-neutral-900 hover:cursor-text bg-transparent": !hasFocus,
				"absolute w-full h-full": isExpanded,
			})}
		>
			<div
				className={cn(
					"flex justify-center items-center h-full overflow-hidden",
					{
						"items-start justify-start": hasFocus,
						"group-hover:items-start group-hover:justify-start p-2 border-[1px] border-transparent":
							!hasFocus,
					},
				)}
			>
				{!hasFocus && !isExpanded && (
					<>
						<div className="text-2xl text-lime group-hover:hidden">+</div>
						<div className="text-base text-neutral-700 hidden group-hover:block text-left break-words">
							<MD className="pointer-events-none">{placeholder}</MD>
						</div>
					</>
				)}
				{hasFocus && (
					<div className="relative w-full h-full">
						<Form
							isLoading={isLoading || isSubmitting}
							onSubmit={async (data) => {
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
						{canExpand && (
							<div className="absolute bottom-2 right-2 flex justify-end z-20">
								<button
									type="button"
									className="hover:text-lime"
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
		</div>
	);
}

interface FormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	onCancel: () => void;
	isLoading: boolean;
	markdown?: boolean;
}

function Form({ onCancel, onSubmit, isLoading }: FormProps) {
	const isMac = useIsMac();
	const inputName = "value";
	const { handleSubmit, setFocus, reset, getValues, control } =
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
			{isLoading && (
				<div className="absolute inset-0 bg-lime text-black flex flex-col items-center justify-between">
					<div className="text-[#b5db29] w-full text-left break-words p-2 overflow-hidden">
						<MD>{getValues(inputName)}</MD>
					</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center">
						<Blob className="w-6 h-6 rotating" />
					</div>
				</div>
			)}
			{!isLoading && (
				<>
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
								className="z-10 overflow-y-auto border-[1px] border-dashed focus:border-lime border-transparent p-2"
							/>
						)}
					/>
					<div className="text-neutral-700 text-sm leading-[16px] absolute translate-y-1/2 bottom-1/2 left-1/2 -translate-x-1/2">
						<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
						<div>to create</div>
					</div>
				</>
			)}
		</form>
	);
}
