"use client";

import {
	hiddenWritersQueryKey,
	useHiddenWriters,
} from "@/hooks/useHiddenWriters";
import {
	type HiddenWriter,
	unhideWriter as unhideWriterApi,
} from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VisuallyHidden } from "radix-ui";
import type { Hex } from "viem";
import { LoadingRelic } from "./LoadingRelic";
import { Modal, ModalTitle } from "./dsl/Modal";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

type HiddenPlacesModalProps = {
	open: boolean;
	onClose: () => void;
};

export function HiddenPlacesModal({ open, onClose }: HiddenPlacesModalProps) {
	const { user, getAccessToken } = usePrivy();
	const queryClient = useQueryClient();
	const address = user?.wallet?.address;
	const queryKey = hiddenWritersQueryKey(address);

	const { data: hiddenWriters, isLoading } = useHiddenWriters({
		enabled: open,
	});

	const {
		mutate: unhideWriter,
		variables: pendingAddress,
		isPending: isUnhiding,
	} = useMutation({
		mutationFn: async (writerAddress: Hex | string) => {
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return unhideWriterApi({ address: writerAddress, authToken });
		},
		mutationKey: ["unhide-writer", address],
		onMutate: async (writerAddress: Hex | string) => {
			await queryClient.cancelQueries({ queryKey });
			const previousHidden = queryClient.getQueryData<HiddenWriter[]>(queryKey);
			queryClient.setQueryData<HiddenWriter[]>(queryKey, (current) =>
				(current ?? []).filter(
					(writer) =>
						writer.address.toLowerCase() !== writerAddress.toLowerCase(),
				),
			);
			return { previousHidden };
		},
		onError: (_error, _writerAddress, context) => {
			queryClient.setQueryData(queryKey, context?.previousHidden);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
			if (address) {
				queryClient.invalidateQueries({ queryKey: ["get-writers", address] });
			}
		},
	});

	const writers = hiddenWriters ?? [];

	return (
		<Modal
			open={open}
			onClose={onClose}
			className="bg-background dark:bg-surface w-full max-w-[400px] max-h-[600px]"
		>
			<VisuallyHidden.Root>
				<ModalTitle>Hidden Places</ModalTitle>
			</VisuallyHidden.Root>
			<div className="space-y-4 h-full">
				{isLoading ? (
					<div className="flex items-center justify-center py-8 text-primary w-full h-full">
						<LoadingRelic size={32} className="rotating" />
					</div>
				) : writers.length === 0 ? (
					<p className="py-8 text-center font-serif italic text-neutral-500 dark:text-neutral-400">
						No hidden Places
					</p>
				) : (
					<div className="max-h-[55vh] overflow-y-auto space-y-2">
						{writers.map((writer) => {
							const isPending =
								isUnhiding &&
								pendingAddress?.toLowerCase() === writer.address.toLowerCase();
							return (
								<div
									key={writer.address}
									className="group relative flex h-full w-full items-center gap-3 rounded-xs bg-surface px-2 py-2 text-left dark:bg-background md:hover:bg-secondary"
								>
									<button
										type="button"
										aria-label="Unhide"
										title="Unhide"
										className="absolute inset-0 z-10 hidden cursor-pointer rounded-xs disabled:cursor-not-allowed disabled:opacity-40 md:block"
										disabled={isPending}
										onClick={() => unhideWriter(writer.address as Hex)}
									/>
									<div className="relative min-w-0 flex-1 w-full h-full flex justify-between items-end">
										<MarkdownRenderer
											markdown={writer.title}
											className="text-black dark:text-white writer-title md:group-hover:text-primary"
										/>
										<div className="pointer-events-none absolute top-0 right-0 hidden h-full w-full items-center justify-center bg-secondary/90 text-lg text-neutral-500 group-hover:text-primary dark:text-neutral-400 md:group-hover:flex">
											<span className="italic">Show?</span>
										</div>
										<div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 text-right md:group-hover:text-primary">
											{writer.entries.length}
										</div>
									</div>
									<button
										type="button"
										aria-label="Unhide"
										className="relative z-20 shrink-0 cursor-pointer rounded-xs px-2 py-1 font-serif italic text-primary outline-none transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
										disabled={isPending}
										onClick={() => unhideWriter(writer.address as Hex)}
									>
										{isPending ? "Restoring" : "Unhide"}
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</Modal>
	);
}
