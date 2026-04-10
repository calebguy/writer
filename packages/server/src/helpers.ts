import { db, publicClient } from "./constants";
import { parseRelayTxId, relay } from "./relay";
import {
	decodeEventLog,
	type Hex,
	getAddress,
	hexToBigInt,
	parseAbiItem,
	recoverTypedDataAddress,
} from "viem";

import { env } from "./env";

// Domain intentionally omits `chainId`. See VerifyTypedData.sol for the
// design rationale (chain-portable signatures). The contract typehash, the
// frontend types schema in web/src/utils/signer.ts, and this domain shape
// must all match exactly.
const getDomain = (address: Hex) => ({
	name: "Writer",
	version: "1",
	verifyingContract: getAddress(address),
});

// secp256k1n / 2 — the upper bound for the "low" half of valid S values.
// Any signature with s > this value is the malleated form of a signature
// whose s' = n - s is in the low half. The chain-side fix (C-2) rejects
// these via OZ ECDSA, but rejecting them here too is defense-in-depth: it
// means a malleated signature never even reaches the relay, saving us the
// gas cost of a chain-side revert.
//
// BigInt literal syntax (`0x...n`) avoided because the server tsconfig
// targets pre-ES2020. Use the BigInt() constructor instead.
const SECP256K1_N_DIV_2 = BigInt(
	"0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0",
);

/**
 * Throws if the signature has a high-S value (i.e. is the malleated form of
 * another valid signature). Call this at the top of every recover*Signer
 * helper, before passing the signature to viem's recoverTypedDataAddress
 * (which does NOT enforce low-S itself).
 *
 * The signature format is `0x` + r(64 hex) + s(64 hex) + v(2 hex) = 132
 * chars total. The s value occupies hex chars 66..130.
 */
function assertLowS(signature: Hex): void {
	if (signature.length !== 132) {
		throw new Error(
			`assertLowS: invalid signature length ${signature.length}, expected 132 (0x + 65 bytes)`,
		);
	}
	const sHex = signature.slice(66, 130);
	const s = BigInt(`0x${sHex}`);
	if (s > SECP256K1_N_DIV_2) {
		throw new Error(
			"high-S signature rejected (ECDSA malleability defense — see audit C-2)",
		);
	}
}

export function recoverCreateWithChunkSigner({
	signature,
	nonce,
	chunkContent,
	chunkCount,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	chunkContent: string;
	chunkCount: bigint;
	address: Hex;
}) {
	assertLowS(signature);
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			chunkCount,
			chunkContent,
		},
		primaryType: "CreateWithChunk",
		types: {
			CreateWithChunk: [
				{ name: "nonce", type: "uint256" },
				{ name: "chunkCount", type: "uint256" },
				{ name: "chunkContent", type: "string" },
			],
		},
		signature,
	});
}

export function recoverUpdateEntryWithChunkSigner({
	signature,
	nonce,
	totalChunks,
	content,
	entryId,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	totalChunks: bigint;
	content: string;
	entryId: bigint;
	address: Hex;
}) {
	assertLowS(signature);
	// Recover the address
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			totalChunks,
			content,
			entryId,
		},
		primaryType: "Update",
		types: {
			Update: [
				{ name: "nonce", type: "uint256" },
				{ name: "entryId", type: "uint256" },
				{ name: "totalChunks", type: "uint256" },
				{ name: "content", type: "string" },
			],
		},
		signature,
	});
}

export function recoverRemoveEntrySigner({
	signature,
	nonce,
	id,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	id: bigint;
	address: Hex;
}) {
	assertLowS(signature);
	return recoverTypedDataAddress({
		domain: getDomain(address),
		message: {
			nonce,
			id,
		},
		primaryType: "Remove",
		types: {
			Remove: [
				{ name: "nonce", type: "uint256" },
				{ name: "id", type: "uint256" },
			],
		},
		signature,
	});
}

export function recoverSetColorSigner({
	signature,
	nonce,
	hexColor,
	address,
}: {
	signature: Hex;
	nonce: bigint;
	hexColor: Hex;
	address: Hex;
}) {
	assertLowS(signature);
	return recoverTypedDataAddress({
		// chainId omitted — see getDomain() above and VerifyTypedData.sol
		domain: {
			name: "ColorRegistry",
			version: "1",
			verifyingContract: getAddress(address),
		},
		message: {
			nonce,
			hexColor,
		},
		primaryType: "SetHex",
		types: {
			SetHex: [
				{ name: "nonce", type: "uint256" },
				{ name: "hexColor", type: "bytes32" },
			],
		},
		signature,
	});
}

const WRITER_STORAGE_ENTRY_CREATED_TOPIC =
	"0xacb3b3e38034857e82db5b66f66ba2dcaa615a3e197a0f2ad7643c030659d1a3";
const WRITER_STORAGE_ENTRY_CREATED_EVENT = parseAbiItem(
	"event EntryCreated(uint256 indexed id,address author)",
);
const WRITER_FACTORY_WRITER_CREATED = parseAbiItem(
	"event WriterCreated(address indexed writerAddress,address indexed storeAddress,address indexed admin,string title,address[] managers)",
);

type RpcReceiptLog = {
	address: string;
	data: string;
	topics: string[];
};

type RpcTransactionReceipt = {
	status: string;
	transactionHash: string;
	blockNumber: string;
	blockTimestamp?: string;
	logs: RpcReceiptLog[];
};

export type ReconcileEntryResult = {
	entryId: number;
	ok: boolean;
	action: "noop" | "updated" | "skipped" | "failed";
	warnings: string[];
	before: {
		onChainId: string | null;
		createdAtHash: string | null;
		createdAtTransactionId: string | null;
	};
	after: {
		onChainId: string | null;
		createdAtHash: string | null;
	};
};

export type ReconcileWriterResult = {
	address: Hex;
	ok: boolean;
	action: "noop" | "updated" | "skipped" | "failed";
	warnings: string[];
	before: {
		storageAddress: string | null;
		createdAtHash: string | null;
		transactionId: string | null;
	};
	after: {
		storageAddress: string | null;
		createdAtHash: string | null;
	};
	entryBackfill: {
		scanned: number;
		upserted: number;
	};
};

type DecodedWriterCreatedArgs = {
	writerAddress: Hex;
	storeAddress: Hex;
	admin: Hex;
	title: string;
	managers: readonly Hex[];
};

async function getReceiptByHash(
	txHash: string,
): Promise<RpcTransactionReceipt | null> {
	try {
		const receipt = await publicClient.getTransactionReceipt({
			hash: txHash as Hex,
		});
		const block = await publicClient.getBlock({
			blockNumber: receipt.blockNumber,
		});

		return {
			status: receipt.status === "success" ? "0x1" : "0x0",
			transactionHash: receipt.transactionHash,
			blockNumber: `0x${receipt.blockNumber.toString(16)}`,
			blockTimestamp: `0x${block.timestamp.toString(16)}`,
			logs: receipt.logs.map((log) => ({
				address: log.address,
				data: log.data,
				topics: [...log.topics],
			})),
		};
	} catch (error) {
		if (error instanceof Error && /not found/i.test(error.message)) {
			return null;
		}
		throw error;
	}
}

function getAddressFromData(data: string): Hex | null {
	if (!data || !data.startsWith("0x")) {
		return null;
	}
	const normalized = data.slice(2);
	if (normalized.length < 64) {
		return null;
	}
	const addressSuffix = normalized.slice(normalized.length - 40);
	return getAddress(`0x${addressSuffix}`) as Hex;
}

async function backfillWriterEntriesByLogs({
	storageAddress,
	fromBlock,
	warnings,
}: {
	storageAddress: Hex;
	fromBlock: bigint;
	warnings: string[];
}) {
	const latestBlock = await publicClient.getBlockNumber();
	if (fromBlock > latestBlock) {
		return { scanned: 0, upserted: 0 };
	}

	const blockTimestamps = new Map<bigint, Date>();
	let scanned = 0;
	let upserted = 0;
	const blockStep = BigInt(50_000);

	for (let start = fromBlock; start <= latestBlock; start += blockStep) {
		const end =
			start + blockStep - BigInt(1) > latestBlock
				? latestBlock
				: start + blockStep - BigInt(1);

		const logs = await publicClient.getLogs({
			address: storageAddress,
			event: WRITER_STORAGE_ENTRY_CREATED_EVENT,
			fromBlock: start,
			toBlock: end,
		});
		scanned += logs.length;

		for (const log of logs) {
			if (
				log.args.id === undefined ||
				!log.args.author ||
				!log.transactionHash ||
				log.blockNumber === null
			) {
				warnings.push(
					`skipped malformed EntryCreated log at block ${String(log.blockNumber)}`,
				);
				continue;
			}

			const blockNumber = log.blockNumber;
			let createdAtBlockDatetime = blockTimestamps.get(blockNumber);
			if (!createdAtBlockDatetime) {
				const block = await publicClient.getBlock({ blockNumber });
				createdAtBlockDatetime = new Date(Number(block.timestamp) * 1000);
				blockTimestamps.set(blockNumber, createdAtBlockDatetime);
			}

			const byOnchain = await db.getEntryByOnchainId(storageAddress, log.args.id);
			const byHash = byOnchain
				? null
				: await db.getEntryByStorageAndCreationHash(
						storageAddress,
						log.transactionHash,
					);
			const [updated] = await db.upsertEntry({
				id: byOnchain?.id ?? byHash?.id,
				storageAddress,
				exists: true,
				onChainId: log.args.id,
				author: log.args.author,
				createdAtHash: log.transactionHash,
				createdAtBlock: blockNumber,
				createdAtBlockDatetime,
				createdAtTransactionId: byHash?.createdAtTransactionId ?? undefined,
			});
			if (updated) {
				upserted += 1;
			}
		}
	}

	return { scanned, upserted };
}

export async function reconcileEntryByDbId(
	entryId: number,
): Promise<ReconcileEntryResult> {
	const entry = await db.getEntryById(entryId);
	if (!entry || entry.deletedAt) {
		return {
			entryId,
			ok: false,
			action: "failed",
			warnings: ["entry not found"],
			before: {
				onChainId: null,
				createdAtHash: null,
				createdAtTransactionId: null,
			},
			after: {
				onChainId: null,
				createdAtHash: null,
			},
		};
	}

	const before = {
		onChainId: entry.onChainId?.toString() ?? null,
		createdAtHash: entry.createdAtHash ?? null,
		createdAtTransactionId: entry.createdAtTransactionId ?? null,
	};
	const warnings: string[] = [];

	if (entry.onChainId && entry.createdAtHash) {
		return {
			entryId,
			ok: true,
			action: "noop",
			warnings,
			before,
			after: {
				onChainId: entry.onChainId.toString(),
				createdAtHash: entry.createdAtHash,
			},
		};
	}

	if (!entry.createdAtTransactionId) {
		return {
			entryId,
			ok: false,
			action: "skipped",
			warnings: ["missing createdAtTransactionId"],
			before,
			after: {
				onChainId: entry.onChainId?.toString() ?? null,
				createdAtHash: entry.createdAtHash ?? null,
			},
		};
	}

	let txHash: string | null = null;
	const relayId = parseRelayTxId(entry.createdAtTransactionId);
	if (relayId) {
		try {
			const txStatus = await relay.getTransaction(relayId.wallet, relayId.nonce);
			txHash = txStatus.hash ?? null;
		} catch (error) {
			warnings.push(
				`failed to fetch relay transaction: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	} else {
		// Legacy Syndicate UUID — try to use hash from DB record
		const dbTx = await db.getTxById(entry.createdAtTransactionId);
		txHash = dbTx?.hash ?? null;
		if (!txHash) {
			warnings.push("legacy Syndicate transaction — relay unavailable");
		}
	}
	if (!txHash) {
		return {
			entryId,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "missing transaction hash"],
			before,
			after: {
				onChainId: entry.onChainId?.toString() ?? null,
				createdAtHash: entry.createdAtHash ?? null,
			},
		};
	}

	const receipt = await getReceiptByHash(txHash);
	if (!receipt) {
		return {
			entryId,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "transaction receipt not found"],
			before,
			after: {
				onChainId: entry.onChainId?.toString() ?? null,
				createdAtHash: entry.createdAtHash ?? null,
			},
		};
	}

	if (receipt.status !== "0x1") {
		return {
			entryId,
			ok: false,
			action: "failed",
			warnings: [...warnings, `transaction reverted (status=${receipt.status})`],
			before,
			after: {
				onChainId: entry.onChainId?.toString() ?? null,
				createdAtHash: entry.createdAtHash ?? null,
			},
		};
	}

	const createdLog = receipt.logs.find(
		(log) =>
			log.address.toLowerCase() === entry.storageAddress.toLowerCase() &&
			log.topics?.[0]?.toLowerCase() === WRITER_STORAGE_ENTRY_CREATED_TOPIC,
	);

	if (!createdLog || createdLog.topics.length < 2) {
		return {
			entryId,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "EntryCreated log not found in receipt"],
			before,
			after: {
				onChainId: entry.onChainId?.toString() ?? null,
				createdAtHash: entry.createdAtHash ?? null,
			},
		};
	}

	const onChainId = hexToBigInt(createdLog.topics[1] as Hex);
	const author = getAddressFromData(createdLog.data) ?? (entry.author as Hex);
	const createdAtBlock = hexToBigInt(receipt.blockNumber as Hex);
	const createdAtBlockDatetime = receipt.blockTimestamp
		? new Date(Number(hexToBigInt(receipt.blockTimestamp as Hex)) * 1000)
		: undefined;

	const [updated] = await db.upsertEntry({
		id: entry.id,
		storageAddress: entry.storageAddress,
		author,
		exists: true,
		onChainId,
		createdAtHash: receipt.transactionHash,
		createdAtBlock,
		createdAtBlockDatetime,
		createdAtTransactionId: entry.createdAtTransactionId,
	});

	return {
		entryId,
		ok: Boolean(updated?.onChainId && updated?.createdAtHash),
		action: "updated",
		warnings,
		before,
		after: {
			onChainId: updated?.onChainId?.toString() ?? null,
			createdAtHash: updated?.createdAtHash ?? null,
		},
	};
}

export async function reconcileWriterByAddress(
	address: Hex,
): Promise<ReconcileWriterResult> {
	const normalizedAddress = getAddress(address);
	const writer = await db.getWriter(normalizedAddress);
	if (!writer || writer.deletedAt) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "failed",
			warnings: ["writer not found"],
			before: {
				storageAddress: null,
				createdAtHash: null,
				transactionId: null,
			},
			after: {
				storageAddress: null,
				createdAtHash: null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	const before = {
		storageAddress: writer.storageAddress ?? null,
		createdAtHash: writer.createdAtHash ?? null,
		transactionId: writer.transactionId ?? null,
	};
	const warnings: string[] = [];
	const reconcileEntriesForWriter = async ({
		storageAddress,
		startBlock,
	}: {
		storageAddress: Hex;
		startBlock: bigint;
	}) =>
		backfillWriterEntriesByLogs({
			storageAddress,
			fromBlock: startBlock,
			warnings,
		});

	if (writer.createdAtHash) {
		const entryBackfill = await reconcileEntriesForWriter({
			storageAddress: writer.storageAddress as Hex,
			startBlock: writer.createdAtBlock ?? BigInt(0),
		});
		return {
			address: normalizedAddress,
			ok: true,
			action: "noop",
			warnings,
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash,
			},
			entryBackfill,
		};
	}

	if (!writer.transactionId) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: ["missing transactionId"],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	let txHash: string | null = null;
	const relayId = parseRelayTxId(writer.transactionId);
	if (relayId) {
		try {
			const txStatus = await relay.getTransaction(relayId.wallet, relayId.nonce);
			txHash = txStatus.hash ?? null;
		} catch (error) {
			warnings.push(
				`failed to fetch relay transaction: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	} else {
		// Legacy Syndicate UUID — try to use hash from DB record
		const dbTx = await db.getTxById(writer.transactionId);
		txHash = dbTx?.hash ?? null;
		if (!txHash) {
			warnings.push("legacy Syndicate transaction — relay unavailable");
		}
	}
	if (!txHash) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "missing transaction hash"],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	const receipt = await getReceiptByHash(txHash);
	if (!receipt) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "transaction receipt not found"],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	if (receipt.status !== "0x1") {
		return {
			address: normalizedAddress,
			ok: false,
			action: "failed",
			warnings: [...warnings, `transaction reverted (status=${receipt.status})`],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	const createdLog = receipt.logs.find(
		(log) => log.address.toLowerCase() === env.FACTORY_ADDRESS.toLowerCase(),
	);
	if (!createdLog) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "WriterCreated log not found in receipt"],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	let decoded: DecodedWriterCreatedArgs | null = null;
	try {
		if (createdLog.topics.length === 0) {
			throw new Error("missing topics");
		}
		const result = decodeEventLog({
			abi: [WRITER_FACTORY_WRITER_CREATED],
			data: createdLog.data as Hex,
			topics: createdLog.topics as [Hex, ...Hex[]],
		});
		if (result.eventName === "WriterCreated") {
			decoded = result.args as DecodedWriterCreatedArgs;
		}
	} catch (error) {
		warnings.push(
			`failed to decode WriterCreated event: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	if (!decoded) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: [...warnings, "failed to decode WriterCreated log"],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	if (decoded.writerAddress.toLowerCase() !== normalizedAddress.toLowerCase()) {
		return {
			address: normalizedAddress,
			ok: false,
			action: "skipped",
			warnings: [
				...warnings,
				`writer address mismatch in receipt: ${decoded.writerAddress}`,
			],
			before,
			after: {
				storageAddress: writer.storageAddress,
				createdAtHash: writer.createdAtHash ?? null,
			},
			entryBackfill: { scanned: 0, upserted: 0 },
		};
	}

	const createdAtBlock = hexToBigInt(receipt.blockNumber as Hex);
	const createdAtBlockDatetime = receipt.blockTimestamp
		? new Date(Number(hexToBigInt(receipt.blockTimestamp as Hex)) * 1000)
		: undefined;

	const [updated] = await db.upsertWriter({
		address: decoded.writerAddress,
		storageAddress: decoded.storeAddress,
		title: decoded.title,
		admin: decoded.admin,
		managers: decoded.managers.map((manager: Hex) => manager.toString()),
		createdAtHash: receipt.transactionHash,
		createdAtBlock,
		createdAtBlockDatetime,
		transactionId: writer.transactionId,
	});
	const entryBackfill = await reconcileEntriesForWriter({
		storageAddress: (updated?.storageAddress ?? decoded.storeAddress) as Hex,
		startBlock: updated?.createdAtBlock ?? createdAtBlock,
	});

	return {
		address: normalizedAddress,
		ok: Boolean(updated?.createdAtHash),
		action: "updated",
		warnings,
		before,
		after: {
			storageAddress: updated?.storageAddress ?? null,
			createdAtHash: updated?.createdAtHash ?? null,
		},
		entryBackfill,
	};
}
