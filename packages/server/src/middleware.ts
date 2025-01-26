import { zValidator } from "@hono/zod-validator";
import { getAddress } from "viem";
import { z } from "zod";

// https://github.com/colinhacks/zod/discussions/1897
export const bigIntSafe = z
	.any()
	.transform((value) => {
		try {
			return BigInt(value);
		} catch {
			return value;
		}
	})
	.pipe(z.bigint());

const bytes32ColorRegex = /^0x[0-9a-fA-F]{64}$/;

const hexColor = z.string().refine((color) => bytes32ColorRegex.test(color), {
	message: "Invalid HEX color format. Use #RRGGBB or #RGB.",
});

const ethAddress = z
	.string()
	.refine(
		(val) => {
			try {
				getAddress(val);
				return true;
			} catch {
				return false;
			}
		},
		{
			message: "Must be a valid Ethereum address",
		},
	)
	.transform((val) => getAddress(val));

export const createEntrySchema = z.object({
	content: z.string(),
});

export const addressParamSchema = zValidator(
	"param",
	z.object({
		address: ethAddress,
	}),
);

export const addressAndIDParamSchema = zValidator(
	"param",
	z.object({
		address: ethAddress,
		id: bigIntSafe,
	}),
);

export const createWithChunkJsonValidator = zValidator(
	"json",
	z.object({
		signature: z.string(),
		nonce: z.number(),
		chunkCount: z.number(),
		chunkContent: z.string(),
	}),
);

export const updateEntryJsonValidator = zValidator(
	"json",
	z.object({
		signature: z.string(),
		nonce: z.number(),
		totalChunks: z.number(),
		content: z.string(),
	}),
);

export const factoryCreateJsonValidator = zValidator(
	"json",
	z.object({
		title: z.string(),
		admin: z.string(),
		managers: z.array(z.string()),
		isPrivate: z.boolean().optional(),
	}),
);

export const deleteEntryJsonValidator = zValidator(
	"json",
	z.object({
		signature: z.string(),
		nonce: bigIntSafe,
	}),
);

export const colorRegistrySetJsonValidator = zValidator(
	"json",
	z.object({
		signature: z.string(),
		nonce: bigIntSafe,
		hexColor: hexColor,
	}),
);
