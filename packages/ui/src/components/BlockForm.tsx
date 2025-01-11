import { useRef } from "react";

import { useState } from "react";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { BlockCreateInput } from "../interfaces";
import { cn } from "../utils/cn";
import { useIsMac } from "../utils/hooks";
import { Editor } from "./Editor";
import { Arrow } from "./icons/Arrow";
import { Blob } from "./icons/Blob";

interface BlockFormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	isLoading?: boolean;
	placeholder?: string;
	expand?: boolean;
}

export default function BlockForm({
	placeholder,
	onSubmit,
	isLoading,
	expand,
}: BlockFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasFocus, setFocus] = useState(false);
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current) {
				if (!ref.current.contains(event.target as Node)) {
					setFocus(false);
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
			})}
		>
			<div
				className={cn("flex justify-center items-center h-full", {
					"items-start justify-start": hasFocus,
					"group-hover:items-start group-hover:justify-start p-2 border-[1px] border-transparent":
						!hasFocus,
				})}
			>
				{!hasFocus && (
					<>
						<div className="text-2xl text-lime group-hover:hidden">+</div>
						<div className="text-base text-neutral-700 hidden group-hover:block text-left break-words">
							{/* wait to render placeholder until it is set as editor will not rerender */}
							{placeholder && <Editor content={placeholder} className="p-0" />}
						</div>
					</>
				)}
				{hasFocus && (
					<Form
						expand={expand}
						isLoading={isLoading || isSubmitting}
						placeholder={placeholder}
						onSubmit={async (data) => {
							setIsSubmitting(true);
							await onSubmit(data).then(() => setFocus(false));
							setIsSubmitting(false);
						}}
						onCancel={() => setFocus(false)}
					/>
				)}
			</div>
		</div>
	);
}

interface FormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	onCancel: () => void;
	placeholder?: string;
	isLoading: boolean;
	expand?: boolean;
	markdown?: boolean;
}

function Form({
	onCancel,
	onSubmit,
	isLoading,
	expand,
	placeholder,
}: FormProps) {
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
						<Editor content={getValues(inputName)} />
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
								placeholder={placeholder}
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
					{expand && (
						<div className="absolute bottom-2 right-2 flex justify-end z-20">
							<button type="button" className="hover:text-lime">
								<Arrow title="expand" className="w-4 h-4 rotate-90" />
							</button>
						</div>
					)}
				</>
			)}
		</form>
	);
}
