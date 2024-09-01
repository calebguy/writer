import { z } from "zod";

export const createSchema = z.object({
	admin: z.string(),
	managers: z.array(z.string()),
});
