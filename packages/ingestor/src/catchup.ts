import type { Db } from "db";
import type { Hex, Log, PublicClient } from "viem";
import type { AddressRegistry } from "./addresses";
import { type BlockData, type TxData, processLog } from "./handlers";

const CHUNK_SIZE = 2000n;
const TX_FETCH_CONCURRENCY = 10;

export async function catchup(
	db: Db,
	client: PublicClient,
	registry: AddressRegistry,
	startBlock: bigint,
): Promise<bigint> {
	const tip = await client.getBlockNumber();
	if (startBlock > tip) {
		console.log(`Already at tip (block ${tip}), nothing to catch up`);
		return tip;
	}

	console.log(
		`Catching up from block ${startBlock} to ${tip} (${tip - startBlock + 1n} blocks)`,
	);

	let fromBlock = startBlock;
	while (fromBlock <= tip) {
		const toBlock = fromBlock + CHUNK_SIZE - 1n > tip ? tip : fromBlock + CHUNK_SIZE - 1n;
		await processBlockRange(db, client, registry, fromBlock, toBlock);
		await db.setCursor(toBlock);
		fromBlock = toBlock + 1n;
	}

	return tip;
}

export async function processBlockRange(
	db: Db,
	client: PublicClient,
	registry: AddressRegistry,
	fromBlock: bigint,
	toBlock: bigint,
): Promise<void> {
	const addresses = registry.getAllAddresses();
	if (addresses.length === 0) return;

	const logs = await client.getLogs({
		address: addresses,
		fromBlock,
		toBlock,
	});

	if (logs.length === 0) return;

	// Batch-fetch transaction data for relay confirmation
	const txCache = await fetchTransactions(client, logs);

	// Build block timestamp cache
	const blockCache = await fetchBlocks(client, logs);

	// Process in (blockNumber, logIndex) order — getLogs returns sorted
	for (const log of logs) {
		const txData = txCache.get(log.transactionHash!);
		if (!txData) continue;
		const blockData = blockCache.get(log.blockNumber!);
		if (!blockData) continue;

		await processLog(log, txData, blockData, db, registry);
	}

	// If new storage addresses were discovered (from WriterCreated events),
	// re-fetch logs for those addresses over the same range. The supplemental
	// logs are storage events, not factory events, so they won't discover
	// more addresses.
	const newAddresses = registry.drainNewlyDiscovered();
	if (newAddresses.length > 0) {
		console.log(
			`Discovered ${newAddresses.length} new storage addresses, fetching supplemental logs for blocks ${fromBlock}-${toBlock}`,
		);
		const supplementalLogs = await client.getLogs({
			address: newAddresses,
			fromBlock,
			toBlock,
		});
		if (supplementalLogs.length > 0) {
			const supTxCache = await fetchTransactions(client, supplementalLogs);
			// Reuse block cache — same block range
			for (const log of supplementalLogs) {
				const txData = supTxCache.get(log.transactionHash!);
				if (!txData) continue;
				const blockData = blockCache.get(log.blockNumber!);
				if (!blockData) continue;
				await processLog(log, txData, blockData, db, registry);
			}
		}
	}
}

async function fetchTransactions(
	client: PublicClient,
	logs: Log[],
): Promise<Map<string, TxData>> {
	const cache = new Map<string, TxData>();
	const uniqueHashes = [
		...new Set(logs.map((l) => l.transactionHash).filter(Boolean)),
	] as string[];

	// Fetch in batches to avoid overwhelming the RPC
	for (let i = 0; i < uniqueHashes.length; i += TX_FETCH_CONCURRENCY) {
		const batch = uniqueHashes.slice(i, i + TX_FETCH_CONCURRENCY);
		const results = await Promise.all(
			batch.map((hash) =>
				client.getTransaction({ hash: hash as Hex }),
			),
		);
		for (const tx of results) {
			if (tx) {
				cache.set(tx.hash, {
					from: tx.from,
					nonce: tx.nonce,
					hash: tx.hash,
				});
			}
		}
	}

	return cache;
}

async function fetchBlocks(
	client: PublicClient,
	logs: Log[],
): Promise<Map<bigint, BlockData>> {
	const cache = new Map<bigint, BlockData>();
	const uniqueBlocks = [
		...new Set(logs.map((l) => l.blockNumber).filter((n) => n != null)),
	] as bigint[];

	for (let i = 0; i < uniqueBlocks.length; i += TX_FETCH_CONCURRENCY) {
		const batch = uniqueBlocks.slice(i, i + TX_FETCH_CONCURRENCY);
		const results = await Promise.all(
			batch.map((blockNumber) =>
				client.getBlock({ blockNumber }),
			),
		);
		for (const block of results) {
			if (block) {
				cache.set(block.number, {
					number: block.number,
					timestamp: block.timestamp,
				});
			}
		}
	}

	return cache;
}
