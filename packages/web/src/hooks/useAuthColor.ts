import { useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import type { Hex } from "viem";
import { WriterContext, defaultColor } from "@/utils/context";
import { getMe } from "@/utils/api";
import { useFirstWallet } from "@/utils/hooks";

export function useAuthColor() {
	const { ready, authenticated } = usePrivy();
	const { setPrimaryFromLongHex, setPrimaryColor } = useContext(WriterContext);

	const isLoggedIn = useMemo(
		() => ready && authenticated,
		[ready, authenticated],
	);

	const wallet = useFirstWallet();
	const { data } = useQuery({
		queryKey: ["me"],
		queryFn: () => getMe(wallet?.address as Hex),
		enabled: isLoggedIn && !!wallet?.address,
	});

	useEffect(() => {
		if (isLoggedIn && data?.user?.color) {
			setPrimaryFromLongHex(data.user.color);
		} else if (!isLoggedIn) {
			setPrimaryColor(defaultColor);
		}
	}, [data?.user?.color, isLoggedIn, setPrimaryFromLongHex, setPrimaryColor]);
}