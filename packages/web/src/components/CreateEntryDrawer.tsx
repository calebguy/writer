"use client";

import type { CreateInputData } from "@/components/CreateInput";
import { Lock } from "@/components/icons/Lock";
import { Unlock } from "@/components/icons/Unlock";
import { useCreateEntryDrawer } from "@/components/writer/CreateEntryDrawerContext";
import { cn } from "@/utils/cn";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "./dsl/DynamicDrawer";
import { LoadingRelic } from "./LoadingRelic";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function CreateEntryDrawer({
	placeholder,
	onSubmit,
	isLoading = false,
}: {
	placeholder?: string;
	onSubmit: (data: CreateInputData) => Promise<void> | void;
	isLoading?: boolean;
}) {
	const { isOpen, setOpen } = useCreateEntryDrawer();
	const [markdown, setMarkdown] = useState("");
	const [encrypted, setEncrypted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleReset = () => {
		setMarkdown("");
		setEncrypted(false);
		setOpen(false);
	};

	const handleSubmit = async () => {
		if (!markdown.trim() || isLoading || isSubmitting) return;
		setIsSubmitting(true);
		await onSubmit({ markdown, encrypted });
		setIsSubmitting(false);
		handleReset();
	};

	return (
		<DynamicDrawerRoot
			open={isOpen}
			onOpenChange={(open) => {
				setOpen(open);
				if (!open) {
					setMarkdown("");
					setEncrypted(false);
				}
			}}
		>
			<DynamicDrawerContent>
				<DynamicDrawerTitle className="sr-only">
					Create Entry
				</DynamicDrawerTitle>
				{isLoading || isSubmitting ? (
					<div className="h-56 flex justify-center items-center">
						<LoadingRelic size={24} />
					</div>
				) : (
					<>
						<div className="h-56 flex flex-col">
							<MDX
								markdown={markdown}
								autoFocus
								aspectSquare={false}
								placeholder={placeholder}
								onChange={setMarkdown}
								className="bg-transparent text-black dark:text-white h-full flex w-full p-2 create-input-mdx"
							/>
						</div>
						<div className="mt-2 flex justify-end">
							<button
								type="button"
								onClick={() => setEncrypted(!encrypted)}
								className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-primary cursor-pointer"
							>
								{encrypted ? (
									<Lock className="h-4 w-4" />
								) : (
									<Unlock className="h-4 w-4" />
								)}
							</button>
						</div>
						<div className="mt-1">
							<button
								type="button"
								onClick={() => void handleSubmit()}
								disabled={!markdown.trim()}
								className={cn(
									"w-full h-10 rounded-md bg-surface dark:bg-surface-raised text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
								)}
							>
								Create
							</button>
						</div>
					</>
				)}
			</DynamicDrawerContent>
		</DynamicDrawerRoot>
	);
}
