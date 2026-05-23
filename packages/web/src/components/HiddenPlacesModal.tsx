"use client";

import {
	getHiddenWritersByManager,
	type HiddenWriter,
	unhideWriter as unhideWriterApi,
} from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { Hex } from "viem";
import { Modal, ModalDescription, ModalTitle } from "./dsl/Modal";
import { MarkdownRenderer } from "./markdown/MarkdownRenderer";

type HiddenPlacesModalProps = {
	open: boolean;
	onClose: () => void;
};

export function HiddenPlacesModal({ open, onClose }: HiddenPlacesModalProps) {
	const { user, getAccessToken } = usePrivy();
	const queryClient = useQueryClient();
	const address = user?.wallet?.address;
	const queryKey = ["hidden-writers", address] as const;

	const { data: hiddenWriters, isLoading } = useQuery({
		queryKey,
		enabled: open && !!address,
		queryFn: async ({ signal }) => {
			if (!address) return [] as HiddenWriter[];
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return getHiddenWritersByManager({
				userAddress: address,
				authToken,
				signal,
			});
		},
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
		<Modal open={open} onClose={onClose} className="bg-background dark:bg-surface">
			<div className="space-y-4">
				<div>
					<ModalTitle>Hidden Places</ModalTitle>
					<ModalDescription>
						Places you hide from Home can be restored here.
					</ModalDescription>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-8 text-primary">
						<AiOutlineLoading3Quarters className="h-5 w-5 rotating" />
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
									className="flex items-center gap-3 rounded-xs bg-surface dark:bg-background px-2 py-2"
								>
									<div className="min-w-0 flex-1">
										<MarkdownRenderer
											markdown={writer.title}
											className="text-black dark:text-white writer-title"
										/>
										<div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
											{writer.entries.length} {writer.entries.length === 1 ? "entry" : "entries"}
										</div>
									</div>
									<button
										type="button"
										className="shrink-0 rounded-xs px-2 py-1 font-serif italic text-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
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
