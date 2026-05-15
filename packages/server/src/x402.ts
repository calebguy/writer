import { AsyncLocalStorage } from "node:async_hooks";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import {
	HTTPFacilitatorClient,
	type RoutesConfig,
	type FacilitatorConfig,
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

function cdpAuthHeaders(): FacilitatorConfig["createAuthHeaders"] | undefined {
	if (!env.CDP_API_KEY_ID || !env.CDP_API_KEY_SECRET) {
		return undefined;
	}

	const apiKeyId = env.CDP_API_KEY_ID;
	const apiKeySecret = env.CDP_API_KEY_SECRET;
	const facilitatorUrl = new URL(env.X402_FACILITATOR_URL);
	if (facilitatorUrl.host !== "api.cdp.coinbase.com") {
		return undefined;
	}

	const requestHost = facilitatorUrl.host;
	const pathPrefix = facilitatorUrl.pathname.replace(/\/$/, "");

	async function bearer(method: "GET" | "POST", path: string) {
		const token = await generateJwt({
			apiKeyId,
			apiKeySecret,
			requestMethod: method,
			requestHost,
			requestPath: `${pathPrefix}${path}`,
			expiresIn: 120,
		});

		return { Authorization: `Bearer ${token}` };
	}

	return async () => ({
		supported: await bearer("GET", "/supported"),
		verify: await bearer("POST", "/verify"),
		settle: await bearer("POST", "/settle"),
	});
}

export function getX402Capabilities() {
	const apiUrl = "https://api.writer.place";
	const payTo = env.X402_PAY_TO_ADDRESS
		? getAddress(env.X402_PAY_TO_ADDRESS)
		: null;

	return {
		version: "1.0",
		name: "Writer x402 capabilities",
		description:
			"Programmatic Writer Place and entry writes paid with x402. Writes are relayed onchain after payment and signature validation.",
		network,
		payTo,
		facilitator: env.X402_FACILITATOR_URL,
		contentType: "application/json",
		capabilities: {
			createPlace: {
				method: "POST",
				endpoint: `${apiUrl}/x402/factory/create`,
				path: "/x402/factory/create",
				price: env.X402_PLACE_CREATE_PRICE,
				description: "Create a Writer Place. The x402 payer becomes admin and sole manager.",
				requires: ["x402 payer equals requested admin address"],
			},
			createEntry: {
				method: "POST",
				endpoint: `${apiUrl}/x402/writer/:address/entry/createWithChunk`,
				path: "/x402/writer/:address/entry/createWithChunk",
				price: env.X402_ENTRY_CREATE_PRICE,
				description: "Create an entry in a Writer Place using an EIP-712 CreateWithChunk signature.",
				requires: [
					"EIP-712 CreateWithChunk signature",
					"x402 payer equals recovered signer",
				],
			},
			updateEntry: {
				method: "POST",
				endpoint: `${apiUrl}/x402/writer/:address/entry/:id/update`,
				path: "/x402/writer/:address/entry/:id/update",
				price: env.X402_ENTRY_UPDATE_PRICE,
				description: "Replace an existing entry using an EIP-712 Update signature. Content is a full replacement, not a patch.",
				requires: [
					"EIP-712 Update signature",
					"x402 payer equals recovered signer",
					"recovered signer equals existing entry author",
					"entry ID may be 0",
				],
			},
			deleteEntry: {
				method: "POST",
				endpoint: `${apiUrl}/x402/writer/:address/entry/:id/delete`,
				path: "/x402/writer/:address/entry/:id/delete",
				price: env.X402_ENTRY_DELETE_PRICE,
				description: "Delete an entry using an EIP-712 Remove signature. Deletion updates Writer state and does not erase historical chain data.",
				requires: [
					"EIP-712 Remove signature",
					"x402 payer equals recovered signer",
					"recovered signer equals existing entry author",
					"entry ID may be 0",
				],
			},
		},
		docs: {
			agents: "https://writer.place/agents.md",
			openapi: "https://writer.place/openapi.json",
		},
	};
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
	"POST /x402/writer/:address/entry/:id/update": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_UPDATE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		description: "Update an entry in a Writer place",
		mimeType: "application/json",
	},
	"POST /x402/writer/:address/entry/:id/delete": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_DELETE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		description: "Delete an entry from a Writer place",
		mimeType: "application/json",
	},
};

const resourceServer = new x402ResourceServer(
	new HTTPFacilitatorClient({
		url: env.X402_FACILITATOR_URL as `${string}://${string}`,
		createAuthHeaders: cdpAuthHeaders(),
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
