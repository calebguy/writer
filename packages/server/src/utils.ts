import { createPublicClient, http } from "viem";
import { base, foundry } from "viem/chains";
import { env, isDev } from "./env";

export const publicClient = createPublicClient({
	chain: isDev ? foundry : base,
	transport: http(env.RPC_URL),
});
