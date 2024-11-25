import { useRef } from "react";

import { useState } from "react";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { BlockCreateInput } from "../interfaces";
import { cn } from "../utils/cn";
import { useFirstWallet, useIsMac } from "../utils/hooks";
import { Blob } from "./icons/Blob";

// @note this needs to take a prop that declares it as either
// markdown or raw text
// raw text: Writers
// markdown: Entries
interface CreateBucketFormProps {
	isLoading: boolean;
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	hoverLabel?: string;
	activeLabel?: string;
}

export default function BlockCreateForm({
	hoverLabel,
	activeLabel,
	onSubmit,
	isLoading,
}: CreateBucketFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isActive, setIsActive] = useState(false);
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current) {
				if (!ref.current.contains(event.target as Node)) {
					setIsActive(false);
				} else {
					setIsActive(true);
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
				"bg-neutral-900": isActive,
				"hover:bg-neutral-900 hover:cursor-text bg-transparent": !isActive,
			})}
		>
			<div
				className={cn("flex justify-center items-center h-full", {
					"items-start justify-start": isActive,
					"group-hover:items-start group-hover:justify-start px-3 py-2":
						!isActive,
				})}
			>
				{!isActive && (
					<>
						<div className="text-2xl text-lime group-hover:hidden">+</div>
						<div className="text-base text-neutral-700 hidden group-hover:block text-left">
							{hoverLabel}
						</div>
					</>
				)}
				{isActive && (
					<CreateForm
						isLoading={isLoading || isSubmitting}
						placeholder={activeLabel}
						onSubmit={async (data) => {
							setIsSubmitting(true);
							await onSubmit(data).then(() => setIsActive(false));
							setIsSubmitting(false);
						}}
						onCancel={() => setIsActive(false)}
					/>
				)}
			</div>
		</div>
	);
}

interface CreateFormProps {
	onSubmit: (data: BlockCreateInput) => Promise<unknown>;
	onCancel: () => void;
	placeholder?: string;
	isLoading: boolean;
}

function CreateForm({
	onCancel,
	placeholder,
	onSubmit,
	isLoading,
}: CreateFormProps) {
	const isMac = useIsMac();
	const address = useFirstWallet()?.address;
	const inputName = "value";
	const { register, handleSubmit, setFocus, reset, getValues } =
		useForm<BlockCreateInput>();
	// const onSubmit: SubmitHandler<CreateNewBucketInputs> = useCallback(
	// 	(data) => {
	// 		mutate({
	// 			title: data[inputName],
	// 			admin: address,
	// 			managers: [address],
	// 		});
	// 	},
	// 	// eslint-disable-next-line react-hooks/exhaustive-deps
	// 	[address],
	// );

	// const { mutate, isPending } = useMutation({
	// 	mutationFn: createFromFactory,
	// 	mutationKey: ["create-from-factory"],
	// 	onSuccess: () => {
	// 		reset();
	// 		onSuccess();
	// 	},
	// });

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Submit form
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				handleSubmit((data) => {
					onSubmit(data).then(() => {
						reset();
					});
				})();
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
		<form className="w-full h-full relative">
			<textarea
				disabled={!address || isLoading}
				className={cn(
					"w-full h-full text-base bg-neutral-900 disabled:opacity-30 placeholder:text-neutral-700 px-3 py-2 outline-none border-[1px] border-dashed border-lime resize-none ants",
				)}
				placeholder={placeholder}
				{...register(inputName)}
			/>
			{isLoading && (
				<div className="absolute inset-0 bg-lime text-black flex flex-col items-center justify-between py-2 px-3">
					<div className="text-[#b5db29] w-full text-left">
						{getValues(inputName)}
					</div>
					<div className="text-sm absolute inset-0 flex justify-center items-center">
						<Blob className="w-6 h-6 rotating" />
					</div>
				</div>
			)}
			{!isLoading && (
				<div className="text-neutral-700 text-sm leading-[16px] mt-1 absolute bottom-3 left-1/2 -translate-x-1/2">
					<div>{isMac ? "⌘" : "ctrl"} + ↵</div>
					<div>to create</div>
				</div>
			)}
		</form>
	);
}
