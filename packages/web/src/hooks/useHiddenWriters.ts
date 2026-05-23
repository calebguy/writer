import {
	getHiddenWritersByManager,
	type HiddenWriter,
} from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

export function hiddenWritersQueryKey(address: string | undefined) {
	return ["hidden-writers", address] as const;
}

export function useHiddenWriters({ enabled = true }: { enabled?: boolean } = {}) {
	const { ready, authenticated, user, getAccessToken } = usePrivy();
	const address = user?.wallet?.address;

	return useQuery({
		queryKey: hiddenWritersQueryKey(address),
		enabled: enabled && ready && authenticated && !!address,
		staleTime: 30 * 1000,
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
}
