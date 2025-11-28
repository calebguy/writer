"use client";

import { useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export function useIsMac() {
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		setIsMac(navigator.platform.toLowerCase().includes("mac"));
	}, []);

	return isMac;
}

export function useOPWallet() {
	const { wallets } = useWallets();
	console.log("wallets", wallets);
	const opWallets = wallets.filter((wallet) => wallet.chainId === "eip155:10");
	console.log("opWallets", opWallets);
	return opWallets[0];
}
