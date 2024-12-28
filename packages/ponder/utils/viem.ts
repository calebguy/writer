import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";
import { env } from "../env";

export const publicClient = createPublicClient({
	chain: optimism,
	transport: http(env.RPC_URL),
});
