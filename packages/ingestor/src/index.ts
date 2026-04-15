import { Db } from "db";
import { env } from "./env";
import { httpClient, wsClient } from "./client";
import { AddressRegistry } from "./addresses";
import { catchup } from "./catchup";
import { startRealtime } from "./realtime";
import { startHealthServer } from "./health";

async function main() {
	const db = new Db(env.DATABASE_URL);

	// Build address registry
	const factories = [env.FACTORY_ADDRESS];
	if (env.OLD_FACTORY_ADDRESS) factories.push(env.OLD_FACTORY_ADDRESS);
	const registry = new AddressRegistry({
		factories,
		colorRegistry: env.COLOR_REGISTRY_ADDRESS,
	});

	// Seed known storage addresses from existing writer rows
	await registry.seedFromDb(db);
	console.log(`Seeded ${registry.storageCount} storage addresses from DB`);

	// Determine starting block
	const cursor = await db.getCursor();
	const startBlock = cursor != null ? cursor + 1n : BigInt(env.START_BLOCK);
	console.log(`Starting from block ${startBlock}`);

	// Catchup phase: batch-process historical blocks
	const lastCaughtUp = await catchup(db, httpClient, registry, startBlock);
	console.log(`Catchup complete at block ${lastCaughtUp}`);

	// Health server
	let currentTip = lastCaughtUp;
	startHealthServer(env.HEALTH_PORT, () => ({
		lastBlock: lastCaughtUp,
		chainTip: currentTip,
		storageAddresses: registry.storageCount,
	}));

	// Periodically update chainTip for the health endpoint
	setInterval(async () => {
		try {
			currentTip = await httpClient.getBlockNumber();
		} catch {
			// Non-critical; health endpoint shows stale tip
		}
	}, 10_000);

	// Realtime phase: WebSocket block subscription
	await startRealtime(db, httpClient, wsClient, registry, lastCaughtUp);
}

// Graceful shutdown
let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
	process.on(signal, () => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`\nReceived ${signal}, shutting down...`);
		// Cursor is already flushed after each block/chunk, so just exit
		process.exit(0);
	});
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
