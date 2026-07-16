import { AsyncLocalStorage } from "node:async_hooks";
import { createFacilitatorConfig } from "@coinbase/x402";
import {
	HTTPFacilitatorClient,
	type RoutesConfig,
	x402ResourceServer,
} from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { paymentMiddleware } from "@x402/hono";
import type { Context, MiddlewareHandler } from "hono";
import { type Hex, getAddress } from "viem";
import { env } from "./env";

type X402PaymentContext = {
	payer?: Hex;
};

const paymentContext = new AsyncLocalStorage<X402PaymentContext>();
const network = env.X402_NETWORK as Network;

const apiUrl = "https://api.writer.place";
const addressExample = "0x0000000000000000000000000000000000000000";
const signatureExample =
	"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const addressSchema = {
	type: "string",
	pattern: "^0x[a-fA-F0-9]{40}$",
} as const;
const hexSchema = {
	type: "string",
	pattern: "^0x[a-fA-F0-9]+$",
} as const;
const nonceSchema = {
	type: "integer",
	minimum: 0,
	description: "Unique nonce included in the EIP-712 typed data.",
} as const;
const entryIdSchema = {
	type: "string",
	pattern: "^[0-9]+$",
	description: "Onchain entry ID. Entry ID 0 is valid.",
} as const;
const pendingAuthorOutput = {
	example: {
		pending: {
			transactionId: "relay_tx_id",
			author: addressExample,
		},
	},
	schema: {
		type: "object",
		properties: {
			pending: {
				type: "object",
				properties: {
					transactionId: { type: "string" },
					author: addressSchema,
				},
				required: ["transactionId", "author"],
			},
		},
		required: ["pending"],
	},
} as const;
const pendingSignerOutput = {
	example: {
		pending: {
			transactionId: "relay_tx_id",
			signer: addressExample,
		},
	},
	schema: {
		type: "object",
		properties: {
			pending: {
				type: "object",
				properties: {
					transactionId: { type: "string" },
					signer: addressSchema,
				},
				required: ["transactionId", "signer"],
			},
		},
		required: ["pending"],
	},
} as const;

function x402PayToAddress() {
	if (!env.X402_PAY_TO_ADDRESS) {
		throw new Error("X402_PAY_TO_ADDRESS is not configured");
	}
	return getAddress(env.X402_PAY_TO_ADDRESS);
}

function bazaarDiscoveryUrl() {
	const facilitatorUrl = new URL(env.X402_FACILITATOR_URL);
	facilitatorUrl.pathname = `${facilitatorUrl.pathname.replace(
		/\/$/,
		"",
	)}/discovery/resources`;
	return facilitatorUrl.toString();
}

function x402FacilitatorConfig() {
	const facilitatorUrl = new URL(env.X402_FACILITATOR_URL);
	if (facilitatorUrl.host !== "api.cdp.coinbase.com") {
		return {
			url: env.X402_FACILITATOR_URL as `${string}://${string}`,
		};
	}

	if (!env.CDP_API_KEY_ID || !env.CDP_API_KEY_SECRET) {
		throw new Error(
			"CDP_API_KEY_ID and CDP_API_KEY_SECRET are required when X402_FACILITATOR_URL uses the Coinbase CDP facilitator",
		);
	}

	return createFacilitatorConfig(env.CDP_API_KEY_ID, env.CDP_API_KEY_SECRET);
}

function x402ErrorDetails(error: unknown) {
	if (!(error instanceof Error)) {
		return { message: String(error) };
	}

	const cause = error.cause;
	return {
		name: error.name,
		message: error.message,
		cause:
			cause instanceof Error
				? { name: cause.name, message: cause.message }
				: cause
					? String(cause)
					: undefined,
	};
}

class WriterFacilitatorClient extends HTTPFacilitatorClient {
	async getSupported() {
		try {
			return await super.getSupported();
		} catch (error) {
			console.error("x402 facilitator supported request failed", {
				facilitator: env.X402_FACILITATOR_URL,
				hasCdpApiKeyId: Boolean(env.CDP_API_KEY_ID),
				hasCdpApiKeySecret: Boolean(env.CDP_API_KEY_SECRET),
				error: x402ErrorDetails(error),
			});
			throw error;
		}
	}
}

export function getX402Capabilities() {
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
				description:
					"Create a Writer Place. The x402 payer becomes admin and sole manager.",
				requires: ["x402 payer equals requested admin address"],
			},
			createEntry: {
				method: "POST",
				endpoint: `${apiUrl}/x402/writer/:address/entry/createWithChunk`,
				path: "/x402/writer/:address/entry/createWithChunk",
				price: env.X402_ENTRY_CREATE_PRICE,
				description:
					"Create an entry in a Writer Place using an EIP-712 CreateWithChunk signature.",
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
				description:
					"Replace an existing entry using an EIP-712 Update signature. Content is a full replacement, not a patch.",
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
				description:
					"Delete an entry using an EIP-712 Remove signature. Deletion updates Writer state and does not erase historical chain data.",
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
		bazaar: {
			discovery: bazaarDiscoveryUrl(),
			routeMetadata:
				"Writer x402 routes include Bazaar discovery extensions with input and output schemas.",
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
		resource: `${apiUrl}/x402/factory/create`,
		description:
			"Create a Writer Place. The x402 payer becomes the admin and sole manager.",
		mimeType: "application/json",
		extensions: {
			...declareDiscoveryExtension({
				bodyType: "json",
				input: {
					address: addressExample,
					title: "Agent notebook",
				},
				inputSchema: {
					type: "object",
					properties: {
						address: {
							...addressSchema,
							description: "Admin wallet address. Must equal the x402 payer.",
						},
						title: {
							type: "string",
							description:
								"Place title. Defaults to Untitled Place if omitted.",
						},
					},
					required: ["address"],
				},
				output: {
					example: {
						writer: {
							address: addressExample,
							storageAddress: addressExample,
							title: "Agent notebook",
							transactionId: "relay_tx_id",
							createdAtHash: null,
						},
					},
					schema: {
						type: "object",
						properties: {
							writer: { type: "object" },
						},
						required: ["writer"],
					},
				},
			}),
		},
	},
	"POST /x402/writer/:address/entry/createWithChunk": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_CREATE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		resource: `${apiUrl}/x402/writer/:address/entry/createWithChunk`,
		description:
			"Create an entry in a Writer Place using an EIP-712 CreateWithChunk signature. The x402 payer must equal the recovered signer.",
		mimeType: "application/json",
		extensions: {
			...declareDiscoveryExtension({
				bodyType: "json",
				pathParams: { address: addressExample },
				pathParamsSchema: {
					type: "object",
					properties: { address: addressSchema },
					required: ["address"],
				},
				input: {
					signature: signatureExample,
					nonce: 123,
					chunkCount: 1,
					chunkContent: "br:<base64-brotli-markdown>",
				},
				inputSchema: {
					type: "object",
					properties: {
						signature: {
							...hexSchema,
							description:
								"EIP-712 CreateWithChunk signature for the target Writer contract.",
						},
						nonce: nonceSchema,
						chunkCount: {
							type: "integer",
							minimum: 1,
							description: "Total chunks. Current SDK and CLI flow uses 1.",
						},
						chunkContent: {
							type: "string",
							description:
								"Final encoded content string. Public markdown should be Brotli encoded as br:<base64>; private content must be encrypted before submission.",
						},
					},
					required: ["signature", "nonce", "chunkCount", "chunkContent"],
				},
				output: pendingAuthorOutput,
			}),
		},
	},
	"POST /x402/writer/:address/entry/:id/update": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_UPDATE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		resource: `${apiUrl}/x402/writer/:address/entry/:id/update`,
		description:
			"Replace an existing Writer entry using an EIP-712 Update signature. The x402 payer must equal the recovered signer, and the signer must match the existing entry author.",
		mimeType: "application/json",
		extensions: {
			...declareDiscoveryExtension({
				bodyType: "json",
				pathParams: { address: addressExample, id: "0" },
				pathParamsSchema: {
					type: "object",
					properties: {
						address: addressSchema,
						id: entryIdSchema,
					},
					required: ["address", "id"],
				},
				input: {
					signature: signatureExample,
					nonce: 124,
					totalChunks: 1,
					content: "br:<base64-brotli-markdown>",
				},
				inputSchema: {
					type: "object",
					properties: {
						signature: {
							...hexSchema,
							description:
								"EIP-712 Update signature for the target Writer contract and entry ID.",
						},
						nonce: nonceSchema,
						totalChunks: {
							type: "integer",
							minimum: 1,
							description:
								"Total replacement chunks. Current SDK and CLI flow uses 1.",
						},
						content: {
							type: "string",
							description:
								"Full replacement encoded content string. This is not a patch.",
						},
					},
					required: ["signature", "nonce", "totalChunks", "content"],
				},
				output: pendingAuthorOutput,
			}),
		},
	},
	"POST /x402/writer/:address/entry/:id/delete": {
		accepts: {
			scheme: "exact",
			price: env.X402_ENTRY_DELETE_PRICE,
			network,
			payTo: x402PayToAddress,
		},
		resource: `${apiUrl}/x402/writer/:address/entry/:id/delete`,
		description:
			"Delete an entry using an EIP-712 Remove signature. Deletion updates Writer state and does not erase historical chain data.",
		mimeType: "application/json",
		extensions: {
			...declareDiscoveryExtension({
				bodyType: "json",
				pathParams: { address: addressExample, id: "0" },
				pathParamsSchema: {
					type: "object",
					properties: {
						address: addressSchema,
						id: entryIdSchema,
					},
					required: ["address", "id"],
				},
				input: {
					signature: signatureExample,
					nonce: 125,
				},
				inputSchema: {
					type: "object",
					properties: {
						signature: {
							...hexSchema,
							description:
								"EIP-712 Remove signature for the target Writer contract and entry ID.",
						},
						nonce: nonceSchema,
					},
					required: ["signature", "nonce"],
				},
				output: pendingSignerOutput,
			}),
		},
	},
};

const resourceServer = new x402ResourceServer(
	new WriterFacilitatorClient(x402FacilitatorConfig()),
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
	let middleware: MiddlewareHandler | undefined;

	return async (c, next) => {
		const x402Middleware = (middleware ??= paymentMiddleware(routes, resourceServer));
		const context: X402PaymentContext = {};
		return paymentContext.run(context, async () => {
			try {
				return await x402Middleware(c, next);
			} catch (error) {
				console.error("x402 payment middleware failed", {
					facilitator: env.X402_FACILITATOR_URL,
					hasCdpApiKeyId: Boolean(env.CDP_API_KEY_ID),
					hasCdpApiKeySecret: Boolean(env.CDP_API_KEY_SECRET),
					error: x402ErrorDetails(error),
				});

				return c.json({ error: "x402 facilitator unavailable" }, 503);
			}
		});
	};
}
