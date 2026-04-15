import type { Hex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	DELETE_ENTRY_FUNCTION_SIGNATURE,
	UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
	db,
} from "./constants";
import { processRawContent } from "utils";

// Loose JSON shapes returned by the server for a writer with entries. The
// overlay lives on the hot read path so we deliberately don't import from
// db.ts — these types are just enough to be safe while we mutate in place.
// Matches the shape emitted by `writerToJsonSafe` + entries from
// `entryToJsonSafe`. Nullable-bigint columns are `string | undefined`;
// nullable-text/timestamp columns come out as `string | null` / `Date | null`.
type WriterJson = {
	address: string;
	storageAddress: string;
	storageId: string;
	publicWritable: boolean;
	legacyDomain: boolean;
	title: string;
	admin: string;
	managers: string[];
	createdAtHash: string | null;
	createdAtBlock: string | undefined;
	createdAtBlockDatetime: Date | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	transactionId: string | null;
	entries: EntryJson[];
};

// Matches the shape emitted by `entryToJsonSafe` exactly: nullable-bigint
// columns come out as `string | undefined` (because `?.toString()` is used),
// nullable-text/timestamp columns come out as `string | null` / `Date | null`
// (because they're spread directly from the drizzle row). Keeping this in
// sync avoids FE type inference drift between the overlay and the existing
// JSON helpers.
type EntryJson = {
	id: number;
	exists: boolean;
	onChainId: string | undefined;
	author: string;
	createdAtHash: string | null;
	createdAtBlock: string | undefined;
	createdAtBlockDatetime: Date | null;
	deletedAtHash: string | null;
	deletedAtBlock: string | undefined;
	deletedAtBlockDatetime: Date | null;
	updatedAtHash: string | null;
	updatedAtBlock: string | undefined;
	updatedAtBlockDatetime: Date | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	storageAddress: string;
	storageId: string;
	createdAtTransactionId: string | null;
	deletedAtTransactionId: string | null;
	updatedAtTransactionId: string | null;
	chunks: Array<{
		id: number;
		entryId: number;
		index: number;
		content: string;
		createdAt: Date;
		createdAtTransactionId: string | null;
	}>;
	raw: string;
	version: string | null;
	decompressed: string | null;
};

type PendingTx = {
	id: string;
	functionSignature: string;
	args: unknown;
	targetAddress: string | null;
	createdAt: Date;
};

// ---------------------------------------------------------------------------
// Writer overlay
// ---------------------------------------------------------------------------

/**
 * Fetches a writer and overlays any in-flight relay_tx rows for it so that
 * optimistic state shows up immediately on page refresh — before the indexer
 * catches up. The writer may not exist in the DB yet (pending factory create);
 * in that case we synthesize a pending-writer shape from the pending tx args
 * so `/writer/:address` stops returning 404 during the ~2–4s indexer window.
 */
export async function getWriterWithOverlay(
	address: Hex,
): Promise<WriterJson | null> {
	const normalized = address.toLowerCase();
	const [dbWriter, pending] = await Promise.all([
		db.getWriter(address),
		db.getPendingTxsFor(normalized),
	]);

	let writer: WriterJson | null = dbWriter
		? writerToJson(dbWriter)
		: synthesizePendingWriter(normalized, pending);

	if (!writer) return null;

	writer.entries = applyPendingEntryOps(writer.entries, writer, pending);
	return writer;
}

/**
 * Same as getWriterWithOverlay but for a list. Batches the pending-tx fetch
 * per writer to keep the /manager/:address route cheap.
 */
export async function applyOverlayToWriters(
	writers: WriterJson[],
): Promise<WriterJson[]> {
	if (writers.length === 0) return writers;
	const pendingByAddress = new Map<string, PendingTx[]>();
	await Promise.all(
		writers.map(async (w) => {
			const pending = await db.getPendingTxsFor(w.address.toLowerCase());
			pendingByAddress.set(w.address.toLowerCase(), pending);
		}),
	);
	return writers.map((w) => {
		const pending = pendingByAddress.get(w.address.toLowerCase()) ?? [];
		return {
			...w,
			entries: applyPendingEntryOps(w.entries, w, pending),
		};
	});
}

/**
 * Overlay helper for the /manager/:address route. Does two things:
 *
 *  1. Applies pending entry ops to each confirmed writer (same as
 *     applyOverlayToWriters).
 *  2. Prepends synthesized pending-writer rows for any pending factory
 *     `create` tx where the caller's address is listed as a manager in
 *     relay_tx.args — so a writer the user just kicked off shows up on
 *     the list page before the indexer picks up WriterCreated.
 */
export async function applyOverlayToWritersForManager(
	managerAddress: string,
	writers: WriterJson[],
): Promise<WriterJson[]> {
	const normalizedManager = managerAddress.toLowerCase();
	const [withEntryOverlay, pendingCreates] = await Promise.all([
		applyOverlayToWriters(writers),
		db.getPendingTxsByFunction(CREATE_FUNCTION_SIGNATURE),
	]);

	const alreadyListed = new Set(
		withEntryOverlay.map((w) => w.address.toLowerCase()),
	);
	const synthesized: WriterJson[] = [];

	console.log("[overlay] manager", normalizedManager, "pendingCreates", pendingCreates.length, "alreadyListed", Array.from(alreadyListed));

	for (const tx of pendingCreates) {
		console.log("[overlay] tx", tx.id, "target", tx.targetAddress, "status", tx.status, "args", JSON.stringify(tx.args));
		if (!tx.targetAddress) { console.log("  skip: no targetAddress"); continue; }
		const target = tx.targetAddress.toLowerCase();
		if (alreadyListed.has(target)) { console.log("  skip: already listed"); continue; }

		const args = tx.args as
			| {
					title?: string;
					admin?: string;
					managers?: string[];
					publicWritable?: boolean;
			  }
			| null;
		if (!args) { console.log("  skip: no args"); continue; }

		const managerHit = (args.managers ?? []).some(
			(m) => m.toLowerCase() === normalizedManager,
		);
		const adminHit = (args.admin ?? "").toLowerCase() === normalizedManager;
		console.log("  managerHit", managerHit, "adminHit", adminHit);
		if (!managerHit && !adminHit) { console.log("  skip: neither manager nor admin hit"); continue; }

		const synth = synthesizePendingWriter(target, [
			{
				id: tx.id,
				functionSignature: tx.functionSignature,
				args: tx.args,
				targetAddress: tx.targetAddress,
				createdAt: tx.createdAt,
			},
		]);
		if (synth) {
			synthesized.push(synth);
			alreadyListed.add(target);
			console.log("  synthesized writer", synth.address);
		} else {
			console.log("  skip: synth returned null");
		}
	}
	console.log("[overlay] synthesized", synthesized.length, "withEntryOverlay", withEntryOverlay.length);

	// Pending creates are the newest rows on the user's list; sort by
	// createdAt desc to match the user's most-recent-first expectation.
	synthesized.sort(
		(a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	return [...synthesized, ...withEntryOverlay];
}

// ---------------------------------------------------------------------------
// Implementation helpers
// ---------------------------------------------------------------------------

/**
 * Apply pending entry ops (create / update / delete) to the confirmed
 * entries list. Pending txs are already ordered DESC by createdAt, so when
 * two pending updates collide on the same onChainId we keep the newer one
 * (first in the list wins); older ops are ignored for that (id, kind).
 */
function applyPendingEntryOps(
	confirmed: EntryJson[],
	writer: WriterJson,
	pending: PendingTx[],
): EntryJson[] {
	const byOnChainId = new Map<string, EntryJson>();
	for (const e of confirmed) {
		if (e.onChainId) byOnChainId.set(e.onChainId, e);
	}
	const result = [...confirmed];
	const appliedUpdate = new Set<string>();
	const appliedDelete = new Set<string>();

	for (const tx of pending) {
		switch (tx.functionSignature) {
			case CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE: {
				const args = tx.args as { chunkContent?: string } | null;
				if (!args?.chunkContent) break;
				// Append only if we don't already have a confirmed entry tied to
				// this same tx. The indexer sets `createdAtTransactionId` when
				// it writes the row; once that happens we drop the overlay.
				if (
					result.some((e) => e.createdAtTransactionId === tx.id)
				) {
					break;
				}
				result.push(synthesizePendingEntry(tx, writer, args.chunkContent));
				break;
			}
			case UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE: {
				const args = tx.args as { id?: number; content?: string } | null;
				if (!args?.id || typeof args.content !== "string") break;
				const onChainId = String(args.id);
				if (appliedUpdate.has(onChainId)) break;
				const target = byOnChainId.get(onChainId);
				if (!target) break;
				appliedUpdate.add(onChainId);
				const patched = patchEntryContent(target, args.content, tx.id);
				const idx = result.findIndex((e) => e.onChainId === onChainId);
				if (idx >= 0) result[idx] = patched;
				break;
			}
			case DELETE_ENTRY_FUNCTION_SIGNATURE: {
				const args = tx.args as { id?: number } | null;
				if (!args?.id) break;
				const onChainId = String(args.id);
				if (appliedDelete.has(onChainId)) break;
				appliedDelete.add(onChainId);
				const idx = result.findIndex((e) => e.onChainId === onChainId);
				if (idx < 0) break;
				const now = tx.createdAt;
				result[idx] = {
					...result[idx],
					deletedAt: now,
					deletedAtTransactionId: tx.id,
				};
				break;
			}
		}
	}

	return result;
}

function synthesizePendingWriter(
	address: string,
	pending: PendingTx[],
): WriterJson | null {
	const createTx = pending.find(
		(tx) => tx.functionSignature === CREATE_FUNCTION_SIGNATURE,
	);
	if (!createTx) return null;

	const args = createTx.args as
		| {
				title?: string;
				admin?: string;
				managers?: string[];
				publicWritable?: boolean;
				salt?: string;
		  }
		| null;
	if (!args) return null;

	// We don't know the deterministic storageAddress without re-computing
	// from salt. For UI purposes during the pending window the exact
	// storageAddress is not yet needed (entries don't exist yet), so we
	// fall back to the writer address itself — a safe placeholder the
	// indexer will overwrite on WriterCreated.
	const now = new Date();
	const createdAt = createTx.createdAt
		? new Date(createTx.createdAt)
		: now;
	return {
		address,
		storageAddress: address,
		storageId: address,
		publicWritable: Boolean(args.publicWritable),
		legacyDomain: false,
		title: args.title ?? "",
		admin: (args.admin ?? "").toLowerCase(),
		managers: (args.managers ?? []).map((m) => m.toLowerCase()),
		createdAtHash: null,
		createdAtBlock: undefined,
		createdAtBlockDatetime: null,
		createdAt,
		updatedAt: createdAt,
		deletedAt: null,
		transactionId: createTx.id,
		entries: [],
	};
}

function synthesizePendingEntry(
	tx: PendingTx,
	writer: WriterJson,
	chunkContent: string,
): EntryJson {
	// Negative id so it can't collide with DB-issued serial ids.
	const tempId = -Math.abs(new Date(tx.createdAt).getTime());
	const raw = chunkContent;
	const { version, decompressed } = processRawContent(raw);
	const args = tx.args as { nonce?: number } | null;
	const _nonce = args?.nonce; // nonce isn't surfaced to callers; intentional
	void _nonce;
	return {
		id: tempId,
		exists: true,
		onChainId: undefined,
		// Author is not directly in args (recovered from signature); the UI
		// can't trust a blank author — leave as empty string here and let the
		// UI fall back to "you" since the cache-optimistic entry is author-authored.
		author: "",
		createdAtHash: null,
		createdAtBlock: undefined,
		createdAtBlockDatetime: null,
		deletedAtHash: null,
		deletedAtBlock: undefined,
		deletedAtBlockDatetime: null,
		updatedAtHash: null,
		updatedAtBlock: undefined,
		updatedAtBlockDatetime: null,
		createdAt: new Date(tx.createdAt),
		updatedAt: new Date(tx.createdAt),
		deletedAt: null,
		storageAddress: writer.storageAddress,
		storageId: writer.storageId,
		createdAtTransactionId: tx.id,
		deletedAtTransactionId: null,
		updatedAtTransactionId: null,
		chunks: [
			{
				id: tempId,
				entryId: tempId,
				index: 0,
				content: chunkContent,
				createdAt: new Date(tx.createdAt),
				createdAtTransactionId: tx.id,
			},
		],
		raw,
		version,
		decompressed,
	};
}

function patchEntryContent(
	entry: EntryJson,
	newContent: string,
	txId: string,
): EntryJson {
	const raw = newContent;
	const { version, decompressed } = processRawContent(raw);
	return {
		...entry,
		raw,
		version,
		decompressed,
		updatedAt: new Date(),
		updatedAtTransactionId: txId,
		chunks:
			entry.chunks.length > 0
				? entry.chunks.map((c, idx) =>
						idx === 0 ? { ...c, content: newContent } : c,
					)
				: [
						{
							id: -Date.now(),
							entryId: entry.id,
							index: 0,
							content: newContent,
							createdAt: new Date(),
							createdAtTransactionId: txId,
						},
					],
	};
}

// ---------------------------------------------------------------------------
// Adapter: convert the Db.getWriter return shape into the loose WriterJson
// the overlay operates on. Mirrors writerToJsonSafe + entryToJsonSafe.
// ---------------------------------------------------------------------------

function writerToJson(
	data: Awaited<ReturnType<typeof db.getWriter>>,
): WriterJson | null {
	if (!data) return null;
	return {
		address: data.address,
		storageAddress: data.storageAddress,
		storageId: data.storageId,
		publicWritable: data.publicWritable,
		legacyDomain: data.legacyDomain,
		title: data.title,
		admin: data.admin,
		managers: data.managers,
		createdAtHash: data.createdAtHash,
		createdAtBlock: data.createdAtBlock?.toString(),
		createdAtBlockDatetime: data.createdAtBlockDatetime,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,
		deletedAt: data.deletedAt,
		transactionId: data.transactionId,
		entries: data.entries.map((e) => {
			const raw = e.chunks.map((c) => c.content).join("");
			const { version, decompressed } = processRawContent(raw);
			return {
				id: e.id,
				exists: e.exists,
				onChainId: e.onChainId?.toString(),
				author: e.author,
				createdAtHash: e.createdAtHash,
				createdAtBlock: e.createdAtBlock?.toString(),
				createdAtBlockDatetime: e.createdAtBlockDatetime,
				deletedAtHash: e.deletedAtHash,
				deletedAtBlock: e.deletedAtBlock?.toString(),
				deletedAtBlockDatetime: e.deletedAtBlockDatetime,
				updatedAtHash: e.updatedAtHash,
				updatedAtBlock: e.updatedAtBlock?.toString(),
				updatedAtBlockDatetime: e.updatedAtBlockDatetime,
				createdAt: e.createdAt,
				updatedAt: e.updatedAt,
				deletedAt: e.deletedAt,
				storageAddress: e.storageAddress,
				storageId: e.storageId,
				createdAtTransactionId: e.createdAtTransactionId,
				deletedAtTransactionId: e.deletedAtTransactionId,
				updatedAtTransactionId: e.updatedAtTransactionId,
				chunks: e.chunks,
				raw,
				version,
				decompressed,
			};
		}),
	};
}
