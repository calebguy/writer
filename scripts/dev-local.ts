import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const stateDir = join(root, "dev");
const chainMetadataPath = join(stateDir, "local-chain.json");
const anvilStatePath = join(stateDir, "anvil-state.json");

const defaults = {
	anvilChainId: "31337",
	anvilHost: "127.0.0.1",
	anvilPort: "8545",
	apiPort: "8787",
	webPort: "3000",
	databaseUrl: "postgresql://writer:writer@localhost:5432/writer?schema=public",
	localRelayPrivateKey:
		"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
	walletConnectProjectId: "local-walletconnect-project-id",
	privyAppId: "local-privy-app-id",
	privySecret: "local-privy-secret",
	previewerUrl: "https://previewer.writer.place",
	x402PayToAddress: "0x0000000000000000000000000000000000000000",
	x402FacilitatorUrl: "http://127.0.0.1:4021",
};

type ChildProcess = {
	kill(): void;
	exited: Promise<number>;
};

type ChainMetadata = {
	factoryAddress: string;
	startBlock: string;
	targetChainId: string;
};

type ProcessOptions = {
	cwd?: string;
	env?: Record<string, string | undefined>;
};

const children: ChildProcess[] = [];
let shuttingDown = false;

function readEnvFile(path: string): Record<string, string> {
	if (!existsSync(path)) return {};
	const values: Record<string, string> = {};
	for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const equals = line.indexOf("=");
		if (equals === -1) continue;
		const key = line.slice(0, equals).trim();
		const rawValue = line.slice(equals + 1).trim();
		values[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
	}
	return values;
}

function configValue(
	key: string,
	fallback: string,
	sources: readonly Record<string, string | undefined>[],
): string {
	for (const source of sources) {
		const value = source[key];
		if (value?.trim()) return value;
	}
	return fallback;
}

function startProcess(
	name: string,
	command: string[],
	options: ProcessOptions = {},
) {
	console.log(`\n[dev] starting ${name}: ${command.join(" ")}`);
	const child = Bun.spawn(command, {
		cwd: root,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		...options,
		env: {
			...process.env,
			...options.env,
		},
	});
	children.push(child);
	void child.exited.then((code) => {
		if (!shuttingDown && code !== 0) {
			console.error(`[dev] ${name} exited with code ${code}`);
			void shutdown(code || 1);
		}
	});
	return child;
}

async function runCommand(
	name: string,
	command: string[],
	options: ProcessOptions = {},
): Promise<string> {
	console.log(`\n[dev] running ${name}: ${command.join(" ")}`);
	const child = Bun.spawn(command, {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
		...options,
		env: {
			...process.env,
			...options.env,
		},
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (stdout) process.stdout.write(stdout);
	if (stderr) process.stderr.write(stderr);
	if (code !== 0) {
		throw new Error(`${name} failed with exit code ${code}`);
	}
	return `${stdout}\n${stderr}`;
}

async function waitForPort(host: string, port: string, name: string) {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			await new Promise<void>((resolvePort, rejectPort) => {
				const socket = connect({
					host,
					port: Number(port),
				});
				socket.once("connect", () => {
					socket.end();
					resolvePort();
				});
				socket.once("error", rejectPort);
				socket.setTimeout(1000, () => {
					socket.destroy();
					rejectPort(new Error("timeout"));
				});
			});
			return;
		} catch {
			await Bun.sleep(250);
		}
	}
	throw new Error(`${name} did not open ${host}:${port}`);
}

async function rpc<T>(
	url: string,
	method: string,
	params: unknown[],
): Promise<T> {
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	if (!response.ok) {
		throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
	}
	const body = (await response.json()) as {
		result?: T;
		error?: { message: string };
	};
	if (body.error) {
		throw new Error(`RPC ${method} failed: ${body.error.message}`);
	}
	return body.result as T;
}

function readChainMetadata(): ChainMetadata | null {
	if (!existsSync(chainMetadataPath)) return null;
	return JSON.parse(readFileSync(chainMetadataPath, "utf8")) as ChainMetadata;
}

function writeServerSecrets(config: LocalConfig) {
	const path = join(root, "packages/server/.dev.vars.local");
	writeFileSync(
		path,
		[
			`DATABASE_URL=${config.databaseUrl}`,
			`PRIVY_APP_ID=${config.privyAppId}`,
			`PRIVY_SECRET=${config.privySecret}`,
			`LOCAL_RELAY_PRIVATE_KEY=${config.localRelayPrivateKey}`,
			"",
		].join("\n"),
	);
}

function parseDeployment(output: string): ChainMetadata {
	const factoryAddress = output.match(
		/FACTORY_ADDRESS=\s*(0x[a-fA-F0-9]{40})/,
	)?.[1];
	const startBlock = output.match(/START_BLOCK=\s*(\d+)/)?.[1] ?? "0";
	const targetChainId =
		output.match(/TARGET_CHAIN_ID=\s*(\d+)/)?.[1] ?? defaults.anvilChainId;
	if (!factoryAddress) {
		throw new Error("Local deploy output did not include FACTORY_ADDRESS");
	}
	return { factoryAddress, startBlock, targetChainId };
}

type LocalConfig = {
	anvilChainId: string;
	anvilHost: string;
	anvilPort: string;
	apiPort: string;
	webPort: string;
	databaseUrl: string;
	localRelayPrivateKey: string;
	walletConnectProjectId: string;
	privyAppId: string;
	privySecret: string;
	previewerUrl: string;
	x402PayToAddress: string;
	x402FacilitatorUrl: string;
};

function loadConfig(): LocalConfig {
	const rootEnv = readEnvFile(join(root, ".env.local-dev"));
	const sources = [process.env, rootEnv];
	return {
		anvilChainId: configValue("ANVIL_CHAIN_ID", defaults.anvilChainId, sources),
		anvilHost: configValue("ANVIL_HOST", defaults.anvilHost, sources),
		anvilPort: configValue("ANVIL_PORT", defaults.anvilPort, sources),
		apiPort: configValue("API_PORT", defaults.apiPort, sources),
		webPort: configValue("WEB_PORT", defaults.webPort, sources),
		databaseUrl: configValue("DATABASE_URL", defaults.databaseUrl, sources),
		localRelayPrivateKey: configValue(
			"LOCAL_RELAY_PRIVATE_KEY",
			defaults.localRelayPrivateKey,
			sources,
		),
		walletConnectProjectId: configValue(
			"NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID",
			defaults.walletConnectProjectId,
			sources,
		),
		privyAppId: configValue("DEV_PRIVY_APP_ID", defaults.privyAppId, sources),
		privySecret: configValue("DEV_PRIVY_SECRET", defaults.privySecret, sources),
		previewerUrl: configValue(
			"NEXT_PUBLIC_PREVIEWER_URL",
			defaults.previewerUrl,
			sources,
		),
		x402PayToAddress: configValue(
			"X402_PAY_TO_ADDRESS",
			defaults.x402PayToAddress,
			sources,
		),
		x402FacilitatorUrl: configValue(
			"X402_FACILITATOR_URL",
			defaults.x402FacilitatorUrl,
			sources,
		),
	};
}

function assertLocalAuthConfigured(config: LocalConfig) {
	const missing: string[] = [];
	if (config.privyAppId === defaults.privyAppId) {
		missing.push("DEV_PRIVY_APP_ID");
	}
	if (config.privySecret === defaults.privySecret) {
		missing.push("DEV_PRIVY_SECRET");
	}
	if (config.walletConnectProjectId === defaults.walletConnectProjectId) {
		missing.push("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID");
	}
	if (missing.length === 0) return;
	throw new Error(
		`Missing local dev auth config: ${missing.join(
			", ",
		)}. Copy .env.local-dev.example to .env.local-dev and fill development credentials.`,
	);
}

async function ensureLocalContracts(
	config: LocalConfig,
): Promise<ChainMetadata> {
	const rpcUrl = `http://${config.anvilHost}:${config.anvilPort}`;
	const existing = readChainMetadata();
	if (existing?.targetChainId === config.anvilChainId) {
		const code = await rpc<string>(rpcUrl, "eth_getCode", [
			existing.factoryAddress,
			"latest",
		]);
		if (code && code !== "0x") {
			console.log(`[dev] reusing WriterFactory ${existing.factoryAddress}`);
			return existing;
		}
	}

	const output = await runCommand(
		"local contract deploy",
		["make", "-C", "packages/chain", "deploy-local"],
		{
			env: {
				ANVIL_RPC_URL: rpcUrl,
				LOCAL_PRIVATE_KEY: config.localRelayPrivateKey,
			},
		},
	);
	const metadata = parseDeployment(output);
	writeFileSync(chainMetadataPath, `${JSON.stringify(metadata, null, "\t")}\n`);
	return metadata;
}

function serverVars(config: LocalConfig, chain: ChainMetadata): string[] {
	return [
		"APP_ENV:DEVELOPMENT",
		"BUN_VERSION:1.2.0",
		`FACTORY_ADDRESS:${chain.factoryAddress}`,
		`RPC_URL:http://${config.anvilHost}:${config.anvilPort}`,
		`TARGET_CHAIN_ID:${chain.targetChainId}`,
		`X402_PAY_TO_ADDRESS:${config.x402PayToAddress}`,
		`X402_FACILITATOR_URL:${config.x402FacilitatorUrl}`,
		"RELAY_URL:",
	].flatMap((value) => ["--var", value]);
}

function startServer(config: LocalConfig, chain: ChainMetadata) {
	startProcess(
		"api",
		[
			"bunx",
			"wrangler",
			"dev",
			"--env",
			"local",
			"--local",
			"--port",
			config.apiPort,
			...serverVars(config, chain),
		],
		{ cwd: join(root, "packages/server") },
	);
}

function startIngestor(config: LocalConfig, chain: ChainMetadata) {
	startProcess("ingestor", ["bun", "--filter", "ingestor", "dev"], {
		env: {
			DATABASE_URL: config.databaseUrl,
			FACTORY_ADDRESS: chain.factoryAddress,
			RPC_URL: `http://${config.anvilHost}:${config.anvilPort}`,
			WS_RPC_URL: `ws://${config.anvilHost}:${config.anvilPort}`,
			TARGET_CHAIN_ID: chain.targetChainId,
			START_BLOCK: chain.startBlock,
			OLD_FACTORY_ADDRESS: "",
			HEALTH_PORT: "3001",
		},
	});
}

function startWeb(config: LocalConfig, chain: ChainMetadata) {
	startProcess(
		"web",
		["bun", "--filter", "web", "dev", "--", "-p", config.webPort],
		{
			env: {
				NEXT_PUBLIC_BASE_URL: `http://localhost:${config.apiPort}`,
				NEXT_PUBLIC_PRIVY_APP_ID: config.privyAppId,
				PRIVY_SECRET: config.privySecret,
				NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: config.walletConnectProjectId,
				NEXT_PUBLIC_TARGET_CHAIN_ID: chain.targetChainId,
				NEXT_PUBLIC_PREVIEWER_URL: config.previewerUrl,
				WRITER_CSP_MODE: "report-only",
			},
		},
	);
}

async function shutdown(code = 0) {
	if (shuttingDown) return;
	shuttingDown = true;
	for (const child of children.toReversed()) {
		child.kill();
	}
	await Promise.allSettled(children.map((child) => child.exited));
	process.exit(code);
}

async function main() {
	mkdirSync(stateDir, { recursive: true });
	const config = loadConfig();
	assertLocalAuthConfigured(config);
	writeServerSecrets(config);

	const resetDatabase =
		process.env.RESET_LOCAL_DB === "1" ||
		process.env.RESET_LOCAL_DB === "true" ||
		!existsSync(chainMetadataPath) ||
		!existsSync(anvilStatePath);
	await runCommand(
		"database",
		resetDatabase
			? ["bun", "--filter", "db", "dev", "--", "--no-cache"]
			: ["bun", "--filter", "db", "dev"],
	);
	startProcess("anvil", [
		"anvil",
		"--chain-id",
		config.anvilChainId,
		"--host",
		config.anvilHost,
		"--port",
		config.anvilPort,
		"--state",
		anvilStatePath,
	]);
	await waitForPort(config.anvilHost, config.anvilPort, "anvil");

	const chain = await ensureLocalContracts(config);
	startServer(config, chain);
	await waitForPort("127.0.0.1", config.apiPort, "api");
	startIngestor(config, chain);
	startWeb(config, chain);
	await waitForPort("127.0.0.1", config.webPort, "web");

	console.log("\n[dev] Writer local dev ready");
	console.log(`[dev] web: http://localhost:${config.webPort}`);
	console.log(`[dev] api: http://localhost:${config.apiPort}`);
	console.log(`[dev] chain: http://${config.anvilHost}:${config.anvilPort}`);
	console.log(`[dev] factory: ${chain.factoryAddress}`);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

try {
	await main();
	await new Promise(() => undefined);
} catch (error) {
	console.error(error);
	await shutdown(1);
}
