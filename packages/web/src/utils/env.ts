import { z } from "zod";

const minString = () => z.string().min(1);

const chainId = () =>
	minString().transform((value, ctx) => {
		const parsed = Number(value);
		if (!Number.isSafeInteger(parsed) || parsed <= 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "must be a positive integer chain ID",
			});
			return z.NEVER;
		}
		return parsed;
	});

/**
 * Client-side env vars (NEXT_PUBLIC_*) are inlined at build time.
 * Server-only env vars (PRIVY_SECRET) are only available in server components/routes.
 */
const schema = z.object({
	NEXT_PUBLIC_BASE_URL: minString(),
	NEXT_PUBLIC_PRIVY_APP_ID: minString(),
	NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: minString(),
	NEXT_PUBLIC_TARGET_CHAIN_ID: chainId(),
	NEXT_PUBLIC_PREVIEWER_URL: minString().default(
		"https://previewer.writer.place",
	),
	PRIVY_SECRET: minString().optional(),
});

export const env = schema.parse({
	NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
	NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
	NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
		process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
	NEXT_PUBLIC_TARGET_CHAIN_ID: process.env.NEXT_PUBLIC_TARGET_CHAIN_ID,
	NEXT_PUBLIC_PREVIEWER_URL: process.env.NEXT_PUBLIC_PREVIEWER_URL,
	PRIVY_SECRET: process.env.PRIVY_SECRET,
});
