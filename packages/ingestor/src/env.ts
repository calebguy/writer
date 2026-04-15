import { z } from "zod";

const minString = () => z.string().min(1);

const schema = z.object({
	DATABASE_URL: minString(),
	RPC_URL: minString(),
	WS_RPC_URL: minString(),
	TARGET_CHAIN_ID: minString().transform((val) => Number(val)),
	FACTORY_ADDRESS: minString(),
	OLD_FACTORY_ADDRESS: minString().optional(),
	COLOR_REGISTRY_ADDRESS: minString(),
	START_BLOCK: minString().transform((val) => Number(val)),
	HEALTH_PORT: minString()
		.transform((val) => Number(val))
		.optional()
		.default("3001"),
});

export const env = schema.parse(process.env);
