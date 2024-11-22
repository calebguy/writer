import { http } from "viem";

import { createPublicClient } from "viem";
import { optimism } from "viem/chains";
import { env } from "../env";

export class Chain {
	private readonly chain = optimism;
	readonly client = createPublicClient({
		chain: this.chain,
		transport: http(env.RPC_URL),
		batch: {
			multicall: {
				wait: 16,
			},
		},
	});
}

const chain = new Chain();
export default chain;
