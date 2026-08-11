import { getMe } from "@/utils/api";
import { WriterContext } from "@/utils/context";
import { useOPWallet } from "@/utils/hooks";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useMemo } from "react";
import type { Hex } from "viem";

export function useAuthTheme() {
	const { ready, authenticated } = usePrivy();
	const {
		setCustomBackgroundFromLongHex,
		setPrimaryFromLongHex,
		resetPrimaryColor,
	} = useContext(WriterContext);

	const isLoggedIn = useMemo(
		() => ready && authenticated,
		[ready, authenticated],
	);

	const [wallet] = useOPWallet();
	const walletAddress = wallet?.address as Hex | undefined;
	const { data } = useQuery({
		queryKey: ["me", walletAddress?.toLowerCase()],
		queryFn: () => {
			if (!walletAddress) {
				throw new Error("wallet address is required");
			}
			return getMe(walletAddress);
		},
		enabled: isLoggedIn && !!walletAddress,
	});

	useEffect(() => {
		if (!ready) return;
		if (authenticated && data) {
			if (data.user?.color) {
				setPrimaryFromLongHex(data.user.color);
			} else {
				resetPrimaryColor();
			}
			setCustomBackgroundFromLongHex(data.user?.customBackgroundColor ?? null);
		} else if (!authenticated) {
			resetPrimaryColor();
			setCustomBackgroundFromLongHex(null);
		}
	}, [
		authenticated,
		data?.user,
		ready,
		setCustomBackgroundFromLongHex,
		setPrimaryFromLongHex,
		resetPrimaryColor,
	]);
}
