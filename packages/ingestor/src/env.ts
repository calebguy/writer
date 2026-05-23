import { z } from "zod";
import { getAddress, isAddress } from "viem";

const minString = () => z.string().min(1);

const parseAddressList = (
	value: string | undefined,
	ctx: z.RefinementCtx,
): string[] => {
	if (!value?.trim()) return [];

	let addresses: string[];
	const trimmed = value.trim();
	if (trimmed.startsWith("[")) {
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (
				!Array.isArray(parsed) ||
				!parsed.every((item): item is string => typeof item === "string")
			) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "must be a JSON string array of Ethereum addresses",
				});
				return z.NEVER;
			}
			addresses = parsed;
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "must be a comma/whitespace-separated list or JSON string array",
			});
			return z.NEVER;
		}
	} else {
		addresses = trimmed.split(/[\s,]+/);
	}

	const normalized = new Map<string, string>();
	for (const raw of addresses) {
		const address = raw.trim();
		if (!isAddress(address)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `invalid Ethereum address in OLD_FACTORY_ADDRESS: ${address}`,
			});
			return z.NEVER;
		}
		const checksummed = getAddress(address);
		normalized.set(checksummed.toLowerCase(), checksummed);
	}

	return [...normalized.values()];
};

const address = () =>
	minString()
		.refine(isAddress, "must be an Ethereum address")
		.transform((val) => getAddress(val));

const schema = z.object({
	DATABASE_URL: minString(),
	RPC_URL: minString(),
	WS_RPC_URL: minString(),
	TARGET_CHAIN_ID: minString().transform((val) => Number(val)),
	FACTORY_ADDRESS: address(),
	OLD_FACTORY_ADDRESS: z
		.string()
		.optional()
		.transform((value, ctx) => parseAddressList(value, ctx)),
	COLOR_REGISTRY_ADDRESS: minString(),
	START_BLOCK: minString().transform((val) => Number(val)),
	HEALTH_PORT: minString()
		.transform((val) => Number(val))
		.optional()
		.default("3001"),
});

export const env = schema.parse(process.env);
