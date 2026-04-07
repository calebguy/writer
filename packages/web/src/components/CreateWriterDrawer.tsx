"use client";

import dynamic from "next/dynamic";
import {
	DynamicDrawerContent,
	DynamicDrawerRoot,
	DynamicDrawerTitle,
} from "./dsl/DynamicDrawer";
import { LoadingRelic } from "./LoadingRelic";

const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

export function CreateWriterDrawer({
	open,
	onOpenChange,
	markdown,
	onMarkdownChange,
	onCreate,
	isPending,
	isDisabled,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	markdown: string;
	onMarkdownChange: (value: string) => void;
	onCreate: () => void;
	isPending: boolean;
	isDisabled: boolean;
}) {
	return (
		<DynamicDrawerRoot open={open} onOpenChange={onOpenChange}>
			<DynamicDrawerContent loading={isPending}>
				<DynamicDrawerTitle className="sr-only">
					Create Writer
				</DynamicDrawerTitle>
				{isPending ? (
					<div className="h-56 md:h-64 flex items-center justify-center">
						<LoadingRelic size={32} className="bg-secondary!" />
					</div>
				) : (
					<>
						<div className="h-56 md:h-64 flex flex-col">
							<MDX
								markdown={markdown}
								autoFocus
								aspectSquare={false}
								placeholder="Create a Place"
								onChange={onMarkdownChange}
								className="bg-transparent text-black dark:text-white h-full flex w-full p-2 create-input-mdx"
							/>
						</div>
						<div className="mt-3 flex gap-2">
							<button
								type="button"
								onClick={onCreate}
								disabled={isDisabled}
								className="w-full h-10 rounded-md bg-surface dark:bg-surface-raised text-black dark:text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
