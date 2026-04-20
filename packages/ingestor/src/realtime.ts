import type { Db } from "db";
import type { PublicClient } from "viem";
import type { AddressRegistry } from "./addresses";
import { processBlockRange } from "./catchup";

const INITIAL_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export async function startRealtime(
	db: Db,
	httpClient: PublicClient,
	wsClient: PublicClient,
	registry: AddressRegistry,
	startFromBlock: bigint,
): Promise<void> {
	let lastProcessed = startFromBlock;
	let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

	console.log(
		`Realtime mode: watching for new blocks from ${lastProcessed + 1n}`,
	);

	return new Promise<void>((_resolve) => {
		let unwatch: (() => void) | null = null;
		let shuttingDown = false;
		let queue: Promise<void> = Promise.resolve();

		const subscribe = () => {
			if (shuttingDown) return;

			unwatch = wsClient.watchBlockNumber({
				onBlockNumber: (blockNumber) => {
					// Reset backoff once we're receiving blocks again
					reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
					queue = queue.then(async () => {
						const from = lastProcessed + 1n;
						if (blockNumber < from) return; // already processed

						if (blockNumber > from) {
							console.log(
								`Gap detected: processing blocks ${from} to ${blockNumber}`,
							);
						}

						// Optimistically advance the cursor so re-entrant handlers
						// queued behind this one see the in-flight range as claimed
						// and no-op via the `blockNumber < from` check above.
						const previousProcessed = lastProcessed;
						lastProcessed = blockNumber;
						try {
							await processBlockRange(
								db,
								httpClient,
								registry,
								from,
								blockNumber,
							);
							await db.setCursor(blockNumber);
						} catch (err) {
							console.error(`Error processing block ${blockNumber}:`, err);
							lastProcessed = previousProcessed;
						}
					});
				},
				onError: (err) => {
					console.error("WebSocket block subscription error:", err);
					if (shuttingDown) return;

					try {
						unwatch?.();
					} catch {
						// Subscription may already be torn down
					}
					unwatch = null;

					const delay = reconnectDelay;
					reconnectDelay = Math.min(
						reconnectDelay * 2,
						MAX_RECONNECT_DELAY_MS,
					);
					console.log(`Resubscribing to block stream in ${delay}ms...`);
					setTimeout(subscribe, delay);
				},
				emitOnBegin: true,
			});
		};

		subscribe();

		const cleanup = () => {
			shuttingDown = true;
			unwatch?.();
		};
		process.on("SIGTERM", cleanup);
		process.on("SIGINT", cleanup);
	});
}
