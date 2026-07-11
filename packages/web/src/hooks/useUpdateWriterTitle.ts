import { hiddenWritersQueryKey } from "@/hooks/useHiddenWriters";
import { type Writer, type WriterSummary, updateWriterTitle } from "@/utils/api";
import { useOPWallet } from "@/utils/hooks";
import { signSetTitle } from "@/utils/signer";
import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";

type UpdateWriterTitleInput = {
	writer: Pick<Writer, "address" | "admin" | "legacyDomain">;
	title: string;
};

function patchWriterTitle<T extends { address: string; title: string }>(
	writer: T,
	address: string,
	title: string,
): T {
	return writer.address.toLowerCase() === address
		? { ...writer, title, updatedAt: new Date().toISOString() }
		: writer;
}

export function useUpdateWriterTitle() {
	const [wallet] = useOPWallet();
	const { getAccessToken, user } = usePrivy();
	const queryClient = useQueryClient();
	const userAddress = user?.wallet?.address;

	const mutation = useMutation({
		mutationFn: async ({ writer, title }: UpdateWriterTitleInput) => {
			if (!wallet) throw new Error("No wallet found");
			if (wallet.address.toLowerCase() !== writer.admin.toLowerCase()) {
				throw new Error("Only the Place admin can edit the title");
			}
			const { signature, nonce } = await signSetTitle(wallet, {
				title,
				address: writer.address,
				legacyDomain: writer.legacyDomain,
			});
			const authToken = await getAccessToken();
			if (!authToken) throw new Error("Not authenticated");
			return updateWriterTitle({
				address: writer.address as Hex,
				signature,
				nonce,
				title,
				authToken,
			});
		},
		mutationKey: ["update-writer-title"],
		onMutate: async ({ writer, title }) => {
			const normalizedAddress = writer.address.toLowerCase();
			await Promise.all([
				queryClient.cancelQueries({ queryKey: ["writer", normalizedAddress] }),
				queryClient.cancelQueries({ queryKey: ["get-writer-summaries"] }),
				queryClient.cancelQueries({ queryKey: ["hidden-writers"] }),
			]);

			const previousWriter = queryClient.getQueryData<Writer>([
				"writer",
				normalizedAddress,
			]);
			const previousWriterSummaries = queryClient.getQueriesData<
				WriterSummary[]
			>({
				queryKey: ["get-writer-summaries"],
			});
			const previousHiddenLists = queryClient.getQueriesData<Writer[]>({
				queryKey: ["hidden-writers"],
			});

			queryClient.setQueryData<Writer>(
				["writer", normalizedAddress],
				(current) =>
					current
						? { ...current, title, updatedAt: new Date().toISOString() }
						: current,
			);
			queryClient.setQueriesData<WriterSummary[]>(
				{ queryKey: ["get-writer-summaries"] },
				(current) =>
					current?.map((item) => patchWriterTitle(item, normalizedAddress, title)),
			);
			queryClient.setQueriesData<Writer[]>(
				{ queryKey: ["hidden-writers"] },
				(current) =>
					current?.map((item) => patchWriterTitle(item, normalizedAddress, title)),
			);

			return { previousWriter, previousWriterSummaries, previousHiddenLists };
		},
		onError: (_error, _vars, context) => {
			if (!context) return;
			if (context.previousWriter) {
				queryClient.setQueryData(
					["writer", context.previousWriter.address.toLowerCase()],
					context.previousWriter,
				);
			}
			for (const [queryKey, data] of context.previousWriterSummaries) {
				queryClient.setQueryData(queryKey, data);
			}
			for (const [queryKey, data] of context.previousHiddenLists) {
				queryClient.setQueryData(queryKey, data);
			}
		},
		onSettled: (_data, _error, vars) => {
			const normalizedAddress = vars?.writer.address.toLowerCase();
			if (normalizedAddress) {
				queryClient.invalidateQueries({ queryKey: ["writer", normalizedAddress] });
			}
			queryClient.invalidateQueries({ queryKey: ["get-writer-summaries"] });
			queryClient.invalidateQueries({ queryKey: hiddenWritersQueryKey(userAddress) });
		},
	});

	return {
		...mutation,
		isSigning: mutation.isPending && wallet?.walletClientType !== "privy",
	};
}
