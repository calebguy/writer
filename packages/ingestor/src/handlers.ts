import type { Db } from "db";
import { decodeEventLog, type Hex, type Log } from "viem";
import type { AddressRegistry } from "./addresses";
import {
	CHUNK_RECEIVED,
	ENTRY_CREATED,
	ENTRY_REMOVED,
	ENTRY_UPDATED,
	HEX_SET,
	LOGIC_SET,
	NEW_WRITER_CREATED,
	OLD_WRITER_CREATED,
	TOPIC0,
} from "./events";
import { confirmRelayTx } from "./relay";

export interface TxData {
	from: string;
	nonce: number;
	hash: string;
}

export interface BlockData {
	number: bigint;
	timestamp: bigint;
}

export async function processLog(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
	registry: AddressRegistry,
): Promise<void> {
	const topic0 = log.topics[0];
	if (!topic0) return;

	switch (topic0) {
		case TOPIC0.NEW_WRITER_CREATED:
			return handleWriterCreated(log, tx, block, db, registry, true);
		case TOPIC0.OLD_WRITER_CREATED:
			return handleWriterCreated(log, tx, block, db, registry, false);
		case TOPIC0.ENTRY_CREATED:
			return handleEntryCreated(log, tx, block, db);
		case TOPIC0.CHUNK_RECEIVED:
			return handleChunkReceived(log, tx, block, db);
		case TOPIC0.ENTRY_UPDATED:
			return handleEntryUpdated(log, tx, block, db);
		case TOPIC0.ENTRY_REMOVED:
			return handleEntryRemoved(log, tx, block, db);
		case TOPIC0.LOGIC_SET:
			return handleLogicSet(log, db);
		case TOPIC0.HEX_SET:
			return handleHexSet(log, db);
	}
}

async function handleWriterCreated(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
	registry: AddressRegistry,
	isNewFactory: boolean,
): Promise<void> {
	const abi = isNewFactory ? NEW_WRITER_CREATED : OLD_WRITER_CREATED;
	const decoded = decodeEventLog({
		abi: [abi],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as {
		writerAddress: string;
		storeAddress: string;
		admin: string;
		title: string;
		managers: readonly string[];
		publicWritable?: boolean;
	};

	console.log("WriterCreated", {
		writer: args.writerAddress,
		store: args.storeAddress,
		title: args.title,
		publicWritable: isNewFactory ? args.publicWritable : false,
	});

	const transactionId = await confirmRelayTx({
		txFrom: tx.from,
		txNonce: tx.nonce,
		blockNumber: block.number,
		txHash: tx.hash,
		db,
	});

	registry.addStorageAddress(args.storeAddress);

	await db.upsertWriter({
		address: args.writerAddress,
		storageAddress: args.storeAddress,
		storageId: args.storeAddress,
		publicWritable: isNewFactory ? Boolean(args.publicWritable) : false,
		legacyDomain: !isNewFactory,
		title: args.title,
		admin: args.admin,
		managers: args.managers.map((m) => m.toString()),
		createdAtHash: tx.hash,
		createdAtBlock: block.number,
		createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
		transactionId,
	});
}

async function handleEntryCreated(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
): Promise<void> {
	const decoded = decodeEventLog({
		abi: [ENTRY_CREATED],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as { id: bigint; author: string };

	const transactionId = await confirmRelayTx({
		txFrom: tx.from,
		txNonce: tx.nonce,
		blockNumber: block.number,
		txHash: tx.hash,
		db,
	});

	console.log("EntryCreated", {
		storage: log.address,
		id: args.id.toString(),
		author: args.author,
	});

	const writerRow = await db.getWriterByStorageAddress(
		log.address as Hex,
	);

	await db.upsertEntry({
		storageAddress: log.address,
		storageId: writerRow?.storageId ?? log.address,
		exists: true,
		onChainId: args.id,
		author: args.author,
		createdAtHash: tx.hash,
		createdAtBlock: block.number,
		createdAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
		createdAtTransactionId: transactionId,
	});
}

async function handleChunkReceived(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
): Promise<void> {
	const decoded = decodeEventLog({
		abi: [CHUNK_RECEIVED],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as {
		author: string;
		id: bigint;
		index: bigint;
		content: string;
	};

	const transactionId = await confirmRelayTx({
		txFrom: tx.from,
		txNonce: tx.nonce,
		blockNumber: block.number,
		txHash: tx.hash,
		db,
	});

	console.log("ChunkReceived", {
		storage: log.address,
		id: args.id.toString(),
		index: args.index.toString(),
	});

	const entry = await db.getEntryByOnchainId(
		log.address as Hex,
		args.id,
	);
	if (!entry) {
		console.error(
			"ChunkReceived: entry not found",
			log.address,
			args.id.toString(),
		);
		return;
	}

	console.log("Upserting chunk", {
		entryId: entry.id,
		index: Number(args.index),
		transactionId,
	});

	try {
		await db.upsertChunk({
			index: Number(args.index),
			entryId: entry.id,
			content: args.content,
			createdAtTransactionId: transactionId,
		});
	} catch (err) {
		console.error("ChunkReceived: upsertChunk failed (continuing)", {
			entryId: entry.id,
			index: Number(args.index),
			error: err instanceof Error ? err.message : String(err),
		});
	}
}

async function handleEntryUpdated(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
): Promise<void> {
	const decoded = decodeEventLog({
		abi: [ENTRY_UPDATED],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as { id: bigint; author: string };

	console.log("EntryUpdated", {
		storage: log.address,
		id: args.id.toString(),
		author: args.author,
	});

	const transactionId = await confirmRelayTx({
		txFrom: tx.from,
		txNonce: tx.nonce,
		blockNumber: block.number,
		txHash: tx.hash,
		db,
	});

	await db.upsertEntry({
		storageAddress: log.address,
		exists: true,
		onChainId: args.id,
		author: args.author,
		updatedAtHash: tx.hash,
		updatedAtBlock: block.number,
		updatedAtBlockDatetime: new Date(Number(block.timestamp) * 1000),
		updatedAtTransactionId: transactionId,
	});
}

async function handleEntryRemoved(
	log: Log,
	tx: TxData,
	block: BlockData,
	db: Db,
): Promise<void> {
	const decoded = decodeEventLog({
		abi: [ENTRY_REMOVED],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as { id: bigint; author: string };

	console.log("EntryRemoved", {
		storage: log.address,
		id: args.id.toString(),
		author: args.author,
	});

	const transactionId = await confirmRelayTx({
		txFrom: tx.from,
		txNonce: tx.nonce,
		blockNumber: block.number,
		txHash: tx.hash,
		db,
	});

	const deletedAt = new Date(Number(block.timestamp) * 1000);

	await db.upsertEntry({
		storageAddress: log.address,
		exists: false,
		onChainId: args.id,
		author: args.author,
		deletedAtHash: tx.hash,
		deletedAtBlock: block.number,
		deletedAtBlockDatetime: deletedAt,
		deletedAt,
		deletedAtTransactionId: transactionId,
	});
}

async function handleLogicSet(log: Log, db: Db): Promise<void> {
	const decoded = decodeEventLog({
		abi: [LOGIC_SET],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as { logicAddress: string };

	const storageAddress = log.address;
	const newLogic = args.logicAddress;

	const updated = await db.updateWriterAddressByStorage(
		storageAddress as Hex,
		newLogic as Hex,
	);
	if (updated === 0) {
		console.log("LogicSet: no writer row yet (deferred to WriterCreated)", {
			storageAddress,
			newLogic,
		});
	} else {
		console.log("LogicSet: rebound writer.address", {
			storageAddress,
			newLogic,
		});
	}
}

async function handleHexSet(log: Log, db: Db): Promise<void> {
	const decoded = decodeEventLog({
		abi: [HEX_SET],
		data: log.data,
		topics: log.topics,
	});
	const args = decoded.args as { user: string; hexColor: string };

	console.log("HexSet", { user: args.user, color: args.hexColor });

	await db.upsertUser({
		address: args.user,
		color: args.hexColor,
	});
}
