import type { Hex } from "viem";

export function shortenAddress(address: Hex) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
