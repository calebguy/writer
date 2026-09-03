import type { Chain } from "viem";
import * as chains from "viem/chains";
import { env } from "./env";

export function getTargetChain(): Chain {
	const chain = Object.values(chains).find(
		(item) => item.id === env.TARGET_CHAIN_ID,
	);
	if (!chain) {
		throw new Error(`Unsupported target chain ID: ${env.TARGET_CHAIN_ID}`);
	}
	return chain;
}
