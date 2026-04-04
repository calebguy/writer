import { z } from "zod";

export enum AppEnv {
	Development = "DEVELOPMENT",
	Production = "PRODUCTION",
}

const minString = () => z.string().min(1);

const logNameExpectedReceived: z.ZodErrorMap = (issue, ctx) => {
	if (issue.code === z.ZodIssueCode.invalid_type) {
		const { path, expected, received } = issue;
		return {
			message: `${path.join(".")}: expected ${expected}, received ${received}`,
		};
	}
	return { message: ctx.defaultError };
};
z.setErrorMap(logNameExpectedReceived);

const schema = z.object({
	APP_ENV: z.enum([AppEnv.Development, AppEnv.Production]),
	DATABASE_URL: minString(),
	RPC_URL: minString(),
	FACTORY_ADDRESS: minString(),
	COLOR_REGISTRY_ADDRESS: minString(),
	RELAY_URL: minString(),
	RELAY_API_KEY: z.string().default(""),
	TARGET_CHAIN_ID: minString().transform((val) => Number(val)),
	ADMIN_KEY: z.string().min(1).optional(),
	PRIVY_APP_ID: minString(),
	PRIVY_SECRET: minString(),
});

export const env = schema.parse(process.env);

export const isDev = env.APP_ENV === AppEnv.Development;
export const isProd = env.APP_ENV === AppEnv.Production;
