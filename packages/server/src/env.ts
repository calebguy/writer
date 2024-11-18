import { z } from "zod";

export enum AppEnv {
	Development = "DEVELOPMENT",
	Staging = "STAGING",
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
	APP_ENV: z.enum([AppEnv.Development, AppEnv.Staging, AppEnv.Production]),
	RPC_URL: minString(),
	FACTORY_ADDRESS: minString(),
	SYNDICATE_API_KEY: minString(),
	SYNDICATE_PROJECT_ID: minString(),
	PRIVY_APP_ID: minString(),
	PRIVY_SECRET: minString(),
	FACTORY_FROM_BLOCK: z.string().transform(BigInt),
});

export const env = schema.parse(process.env);

export const isDev = env.APP_ENV === AppEnv.Development;
export const isStaging = env.APP_ENV === AppEnv.Staging;
export const isProd = env.APP_ENV === AppEnv.Production;
