import { z } from "zod";

export const createSchema = z.object({
	title: z.string(),
	admin: z.string(),
	managers: z.array(z.string()),
});
