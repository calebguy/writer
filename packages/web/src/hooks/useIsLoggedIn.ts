"use client";

import { AuthHintContext } from "@/utils/context";
import { usePrivy } from "@privy-io/react-auth";
import { useContext } from "react";

export function useIsLoggedIn(): boolean {
	const hint = useContext(AuthHintContext);
	const { ready, authenticated } = usePrivy();
	return ready ? authenticated : hint;
}
