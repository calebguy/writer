import type { Context, MiddlewareHandler } from "hono";
import { getAddress, type Hex } from "viem";
import { exact } from "x402/schemes";
import {
	findMatchingPaymentRequirements,
	processPriceToAtomicAmount,
	toJsonSafe,
} from "x402/shared";
import {
	type Network,
	type PaymentPayload,
	type PaymentRequirements,
	settleResponseHeader,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import { env } from "./env";

const X402_VERSION = 1;

type X402RouteKind = "place" | "entry";

const routePrices: Record<X402RouteKind, string> = {
	place: env.X402_PLACE_CREATE_PRICE,
	entry: env.X402_ENTRY_CREATE_PRICE,
};

function routeKind(path: string): X402RouteKind {
	return path.includes("/entry/") ? "entry" : "place";
}

function buildPaymentRequirements(c: Context): PaymentRequirements[] {
	if (!env.X402_PAY_TO_ADDRESS) {
		throw new Error("X402_PAY_TO_ADDRESS is not configured");
	}

	const kind = routeKind(c.req.path);
	const price = routePrices[kind];
	const network = env.X402_NETWORK as Network;
	const parsedPrice = processPriceToAtomicAmount(price, network);
	if ("error" in parsedPrice) {
		throw new Error(parsedPrice.error);
	}

	const { maxAmountRequired, asset } = parsedPrice;
	if (!("eip712" in asset)) {
		throw new Error(`Unsupported x402 EVM network: ${network}`);
	}

	return [
		{
			scheme: "exact",
			network,
			maxAmountRequired,
			resource: c.req.url,
			description:
				kind === "place"
					? "Create a Writer place"
					: "Create an entry in a Writer place",
			mimeType: "application/json",
			payTo: getAddress(env.X402_PAY_TO_ADDRESS),
			maxTimeoutSeconds: 300,
			asset: getAddress(asset.address as Hex),
			outputSchema: {
				input: {
					type: "http",
					method: c.req.method.toUpperCase(),
					discoverable: true,
				},
			},
			extra: asset.eip712,
		},
	];
}

export function getX402Payer(c: Context): Hex | undefined {
	return c.get("x402Payer" as never) as Hex | undefined;
}

export function x402PaymentMiddleware(): MiddlewareHandler {
	const { verify, settle } = useFacilitator({
		url: env.X402_FACILITATOR_URL as `${string}://${string}`,
	});

	return async (c, next) => {
		let paymentRequirements: PaymentRequirements[];
		try {
			paymentRequirements = buildPaymentRequirements(c);
		} catch (err) {
			return c.json(
				{
					error:
						err instanceof Error
							? err.message
							: "x402 payment is not configured",
				},
				503,
			);
		}

		const payment = c.req.header("X-PAYMENT");
		if (!payment) {
			return c.json(
				{
					error: "X-PAYMENT header is required",
					accepts: toJsonSafe(paymentRequirements),
					x402Version: X402_VERSION,
				},
				402,
			);
		}

		let decodedPayment: PaymentPayload;
		try {
			decodedPayment = exact.evm.decodePayment(payment);
			decodedPayment.x402Version = X402_VERSION;
		} catch (err) {
			return c.json(
				{
					error:
						err instanceof Error ? err.message : "Invalid or malformed payment",
					accepts: toJsonSafe(paymentRequirements),
					x402Version: X402_VERSION,
				},
				402,
			);
		}

		const selectedPaymentRequirements = findMatchingPaymentRequirements(
			paymentRequirements,
			decodedPayment,
		);
		if (!selectedPaymentRequirements) {
			return c.json(
				{
					error: "Unable to find matching payment requirements",
					accepts: toJsonSafe(paymentRequirements),
					x402Version: X402_VERSION,
				},
				402,
			);
		}

		const verification = await verify(
			decodedPayment,
			selectedPaymentRequirements,
		);
		if (!verification.isValid) {
			return c.json(
				{
					error: verification.invalidReason ?? "Payment verification failed",
					accepts: toJsonSafe(paymentRequirements),
					payer: verification.payer,
					x402Version: X402_VERSION,
				},
				402,
			);
		}
		if (!verification.payer) {
			return c.json({ error: "Payment payer missing" }, 402);
		}

		c.set("x402Payer" as never, getAddress(verification.payer) as never);

		await next();

		let res = c.res;
		if (res.status >= 400) {
			return;
		}

		c.res = undefined;
		const settlement = await settle(
			decodedPayment,
			selectedPaymentRequirements,
		);
		if (settlement.success) {
			res.headers.set("X-PAYMENT-RESPONSE", settleResponseHeader(settlement));
			c.res = res;
			return;
		}

		c.res = c.json(
			{
				error: settlement.errorReason ?? "Failed to settle payment",
				accepts: toJsonSafe(paymentRequirements),
				x402Version: X402_VERSION,
			},
			402,
		);
	};
}
