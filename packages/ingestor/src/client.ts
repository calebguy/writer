import {
	createPublicClient,
	http,
	webSocket,
	type Chain,
	type PublicClient,
} from "viem";
import * as chains from "viem/chains";
import { env } from "./env";

function getChain(): Chain {
	const chain = Object.values(chains).find((c) => c.id === env.TARGET_CHAIN_ID);
	if (!chain) {
		throw new Error(`No viem chain found for chainId ${env.TARGET_CHAIN_ID}`);
	}
	return chain;
}

const chain = getChain();

export const httpClient: PublicClient = createPublicClient({
	chain,
	transport: http(env.RPC_URL, {
		retryCount: 3,
		retryDelay: 1000,
	}),
});

export const wsClient: PublicClient = createPublicClient({
	chain,
	transport: webSocket(env.WS_RPC_URL, {
		keepAlive: true,
		name: "ingestor-ws",
		key: "ingestor-ws",
		reconnect: true,
		retryCount: 5,
		retryDelay: 2000,
	}),
});
