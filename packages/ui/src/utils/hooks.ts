import { useWallets } from "@privy-io/react-auth";
import { useMemo } from "react";

export function useIsMac() {
	return useMemo(() => navigator.platform.toLowerCase().includes("mac"), []);
}

export function useFirstWallet() {
	const { wallets } = useWallets();
	return wallets[0];
}
