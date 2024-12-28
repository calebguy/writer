import { env } from "server/src/env";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

export const publicClient = createPublicClient({
	chain: optimism,
	transport: http(env.RPC_URL),
});
