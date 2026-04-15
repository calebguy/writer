import type { Db } from "db";
import type { PublicClient } from "viem";
import type { AddressRegistry } from "./addresses";
import { processBlockRange } from "./catchup";

export async function startRealtime(
	db: Db,
	httpClient: PublicClient,
	wsClient: PublicClient,
	registry: AddressRegistry,
	startFromBlock: bigint,
): Promise<void> {
	let lastProcessed = startFromBlock;

	console.log(
		`Realtime mode: watching for new blocks from ${lastProcessed + 1n}`,
	);

	return new Promise<void>((_, reject) => {
		const unwatch = wsClient.watchBlockNumber({
			onBlockNumber: async (blockNumber) => {
				try {
					// Handle gaps (missed blocks during brief disconnects)
					const from = lastProcessed + 1n;
					if (blockNumber < from) return; // already processed

					if (blockNumber > from) {
						console.log(
							`Gap detected: processing blocks ${from} to ${blockNumber}`,
						);
					}

					await processBlockRange(
						db,
						httpClient,
						registry,
						from,
						blockNumber,
					);
					await db.setCursor(blockNumber);
					lastProcessed = blockNumber;
				} catch (err) {
					console.error(`Error processing block ${blockNumber}:`, err);
					// Don't reject — the next block will retry from lastProcessed
				}
			},
			onError: (err) => {
				console.error("WebSocket block subscription error:", err);
				reject(err);
			},
			emitOnBegin: true,
		});

		// Clean up on process exit
		const cleanup = () => {
			unwatch();
		};
		process.on("SIGTERM", cleanup);
		process.on("SIGINT", cleanup);
	});
}
