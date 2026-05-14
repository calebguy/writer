import { AsyncLocalStorage } from "node:async_hooks";
import {
	HTTPFacilitatorClient,
	type RoutesConfig,
	x402ResourceServer,
} from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/hono";
import type { Context, MiddlewareHandler } from "hono";
import { type Hex, getAddress } from "viem";
import { env } from "./env";

type X402PaymentContext = {
	payer?: Hex;
};

const paymentContext = new AsyncLocalStorage<X402PaymentContext>();
const network = env.X402_NETWORK as Network;

function x402PayToAddress() {
	if (!env.X402_PAY_TO_ADDRESS) {
		throw new Error("X402_PAY_TO_ADDRESS is not configured");
	}
	return getAddress(env.X402_PAY_TO_ADDRESS);
}

const routes: RoutesConfig = {
	"POST /x402/factory/create": {
		accepts: {
			scheme: "exact",
			price: env.X402_PLACE_CREATE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		description: "Create a Writer place",
		mimeType: "application/json",
	},
	"POST /x402/writer/:address/entry/createWithChunk": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_CREATE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		description: "Create an entry in a Writer place",
		mimeType: "application/json",
	},
};

const resourceServer = new x402ResourceServer(
	new HTTPFacilitatorClient({
		url: env.X402_FACILITATOR_URL as `${string}://${string}`,
	}),
)
	.register("eip155:*" as Network, new ExactEvmScheme())
	.onAfterVerify(async ({ result }) => {
		if (!result.payer) return;
		const context = paymentContext.getStore();
		if (context) {
			context.payer = getAddress(result.payer) as Hex;
		}
	});

export function getX402Payer(_c: Context): Hex | undefined {
	return paymentContext.getStore()?.payer;
}

export function x402PaymentMiddleware(): MiddlewareHandler {
	const middleware = paymentMiddleware(routes, resourceServer);

	return async (c, next) => {
		const context: X402PaymentContext = {};
		return paymentContext.run(context, () => middleware(c, next));
	};
}
