import { anvil, optimism, type Chain } from "viem/chains";
import { env } from "./env";

const supportedChains = [optimism, anvil] as const satisfies readonly Chain[];

export function chainForTargetChainId(targetChainId: number): Chain {
	const chain = supportedChains.find((item) => item.id === targetChainId);
	if (!chain) {
		throw new Error(`Unsupported target chain ID: ${targetChainId}`);
	}
	return chain;
}

export const targetChain = chainForTargetChainId(
	env.NEXT_PUBLIC_TARGET_CHAIN_ID,
);
export const targetChainCaip2Id = `eip155:${targetChain.id}`;
