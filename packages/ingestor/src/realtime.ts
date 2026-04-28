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
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let reconnectScheduled = false;
		let reconnectAttemptsInMinute = 0;
		let socketResetAttemptsInMinute = 0;
		const reconnectMetricsInterval = setInterval(() => {
			if (socketResetAttemptsInMinute > 0) {
				console.warn(
					`WS socket cache resets in last minute: ${socketResetAttemptsInMinute}`,
				);
				socketResetAttemptsInMinute = 0;
			}

			if (reconnectAttemptsInMinute > 0) {
				console.warn(
					`WS reconnect attempts in last minute: ${reconnectAttemptsInMinute}`,
				);
				reconnectAttemptsInMinute = 0;
			}
		}, 60_000);

		const clearReconnectTimer = () => {
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			reconnectScheduled = false;
		};

		const closeCachedSocketClient = async (reason: string) => {
			try {
				const transport = wsClient.transport as unknown as {
					getRpcClient?: () => Promise<{ close?: () => void }>;
				};
				if (typeof transport.getRpcClient !== "function") return;
				const rpcClient = await transport.getRpcClient();
				if (typeof rpcClient?.close === "function") {
					rpcClient.close();
					socketResetAttemptsInMinute += 1;
					console.warn(`Reset WS socket client cache (${reason}).`);
				}
			} catch (err) {
				console.warn("Failed to reset WS socket client cache:", err);
			}
		};

		const wsHeartbeatInterval = setInterval(() => {
			if (shuttingDown) return;
			void wsClient.getBlockNumber().catch((err) => {
				console.warn("WS heartbeat failed:", err);
			});
		}, 5 * 60_000);

		const stopWatching = () => {
			const stop = unwatch;
			unwatch = null;
			if (!stop) return;
			try {
				stop();
			} catch {
				// Subscription may already be torn down
			}
		};

		const scheduleReconnect = () => {
			if (shuttingDown || reconnectScheduled) return;

			reconnectAttemptsInMinute += 1;
			const baseDelay = reconnectDelay;
			reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
			const jitterFactor = 0.8 + Math.random() * 0.4; // +/-20%
			const delay = Math.max(250, Math.floor(baseDelay * jitterFactor));

			reconnectScheduled = true;
			console.log(
				`Resubscribing to block stream in ${delay}ms (base ${baseDelay}ms)...`,
			);
			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				reconnectScheduled = false;
				subscribe();
			}, delay);
		};

		const subscribe = () => {
			if (shuttingDown || unwatch) return;

			unwatch = wsClient.watchBlockNumber({
				onBlockNumber: (blockNumber) => {
					// Reset backoff once we're receiving blocks again.
					reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
					clearReconnectTimer();

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

					stopWatching();
					void closeCachedSocketClient("onError");
					scheduleReconnect();
				},
				emitOnBegin: true,
			});
		};

		subscribe();

		const cleanup = () => {
			shuttingDown = true;
			clearInterval(reconnectMetricsInterval);
			clearInterval(wsHeartbeatInterval);
			clearReconnectTimer();
			stopWatching();
			void closeCachedSocketClient("cleanup");
		};
		process.on("SIGTERM", cleanup);
		process.on("SIGINT", cleanup);
	});
}
