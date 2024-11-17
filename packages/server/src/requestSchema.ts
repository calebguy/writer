import { z } from "zod";

export const createWriterSchema = z.object({
	title: z.string(),
	admin: z.string(),
	managers: z.array(z.string()),
});

export const createEntrySchema = z.object({
	content: z.string(),
});

export const createWithChunkSchema = z.object({
	signature: z.string(),
	nonce: z.number(),
	totalChunks: z.number(),
	chunkContent: z.string(),
	content: z.string(),
});
