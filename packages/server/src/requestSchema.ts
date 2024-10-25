import { z } from "zod";

export const createWriterSchema = z.object({
	title: z.string(),
	admin: z.string(),
	managers: z.array(z.string()),
});

export const createEntrySchema = z.object({
	content: z.string(),
});
