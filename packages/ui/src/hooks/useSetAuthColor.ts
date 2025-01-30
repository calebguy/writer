import { useContext, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect } from "react";
import { WriterContext, defaultColor } from "../context";
import { getMe } from "../utils/api";

export function useSetAuthColor() {
	const { ready, authenticated } = usePrivy();
	const { setPrimaryFromLongHex, setPrimaryColor } = useContext(WriterContext);

	const isLoggedIn = useMemo(
		() => ready && authenticated,
		[ready, authenticated],
	);
	const { data } = useQuery({
		queryKey: ["me"],
		queryFn: () => getMe(),
		enabled: isLoggedIn,
	});

	// Set the user's color when they login
	// biome-ignore lint/correctness/useExhaustiveDependencies: setPrimaryFromLongHex as dep causes infinite re-render
	useEffect(() => {
		if (isLoggedIn && data?.user?.color) {
			setPrimaryFromLongHex(data.user.color);
		} else if (!isLoggedIn) {
			setPrimaryColor(defaultColor);
		}
	}, [data?.user?.color, isLoggedIn]);
}
