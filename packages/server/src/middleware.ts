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

export const postDeleteEntryParamSchema = zValidator(
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

export const factoryCreateJsonValidator = zValidator(
	"json",
	z.object({
		title: z.string(),
		admin: z.string(),
		managers: z.array(z.string()),
	}),
);

export const deleteEntryJsonValidator = zValidator(
	"json",
	z.object({
		signature: z.string(),
		nonce: bigIntSafe,
	}),
);
