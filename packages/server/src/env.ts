export enum AppEnv {
	Local = "local",
	Development = "development",
	Production = "production",
}

export const env = {
	APP_ENV: process.env.APP_ENV as AppEnv,
	RPC_URL: process.env.RPC_URL as string,
};

for (const key in env) {
	if (!env[key as keyof typeof env]) {
		throw new Error(`Environment variable ${key} is missing`);
	}
}

export const isDev = env.APP_ENV === AppEnv.Development;
