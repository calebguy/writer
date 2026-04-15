import {
	and,
	arrayContains,
	desc,
	eq,
	inArray,
	isNull,
	lt,
	notLike,
	or,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { processRawContent } from "utils";
import type { Hex } from "viem";
import {
	chunkRelations,
	entryRelations,
	savedEntryRelations,
	savedWriterRelations,
	relayTxRelations,
	writerRelations,
} from "./src/relations";
import {
	chunk,
	entry,
	ingestorCursor,
	savedEntry,
	savedWriter,
	relayTx,
	user,
	writer,
} from "./src/schema";

class Db {
	private pg;

	constructor(private readonly connectionUrl: string) {
		this.pg = drizzle({
			casing: "snake_case",
			connection: this.connectionUrl,
			schema: {
				writer,
				entry,
				relayTx,
				user,
				chunk,
				savedWriter,
				savedEntry,
				ingestorCursor,
				writerRelations,
				entryRelations,
				chunkRelations,
				savedWriterRelations,
				savedEntryRelations,
				relayTxRelations,
			},
		});
	}

	async getWritersByManager(managerAddress: Hex) {
		const writers = await this.pg.query.writer.findMany({
			where: and(
				arrayContains(writer.managers, [managerAddress.toLowerCase()]),
				isNull(writer.deletedAt),
			),
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
		});
		const storageAddresses = writers
			.filter((w) => w.storageAddress !== null)
			.map((w) => w.storageAddress) as string[];
		const entries = await this.pg.query.entry.findMany({
			where: and(
				inArray(
					entry.storageAddress,
					storageAddresses.map((s) => s.toLowerCase()),
				),
				isNull(entry.deletedAt),
			),
			orderBy: (entry, { desc }) => [desc(entry.createdAt)],
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		return writers.map((w) => ({
			...w,
			entries: entries.filter((e) => e.storageAddress === w.storageAddress),
		}));
	}

	/**
	 * Look up a writer row by its storage contract address. Used by the
	 * indexer's EntryCreated handler to denormalize the writer's frozen
	 * storage_id onto each newly-created entry, and by the LogicSet handler
	 * to rebind a writer's logic address after migration. Returns null if
	 * no writer exists for that storage address (which can happen during
	 * re-index when EntryCreated arrives before WriterCreated).
	 */
	async getWriterByStorageAddress(storageAddress: Hex | string) {
		return this.pg.query.writer.findFirst({
			where: eq(writer.storageAddress, storageAddress.toLowerCase()),
		});
	}

	async getWriter(address: Hex) {
		const data = await this.pg.query.writer.findFirst({
			where: eq(writer.address, address.toLowerCase()),
		});
		if (!data) {
			return null;
		}
		const entries = await this.pg.query.entry.findMany({
			where: and(
				eq(entry.storageAddress, data.storageAddress.toLowerCase()),
				isNull(entry.deletedAt),
			),
			orderBy: (entry, { desc }) => [desc(entry.createdAt)],
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		return {
			...data,
			entries,
		};
	}

	async getEntry(storageAddress: Hex, id: number) {
		const data = await this.pg.query.entry.findFirst({
			where: and(
				eq(entry.storageAddress, storageAddress.toLowerCase()),
				eq(entry.id, id),
			),
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		if (!data) {
			return null;
		}
		return data;
	}

	async getEntryByOnchainId(storageAddress: Hex, id: bigint) {
		const data = await this.pg.query.entry.findFirst({
			where: and(
				eq(entry.storageAddress, storageAddress.toLowerCase()),
				eq(entry.onChainId, id),
			),
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		if (!data) {
			return null;
		}
		return data;
	}

	async getEntryByStorageAndCreationHash(storageAddress: Hex, hash: string) {
		const normalizedStorageAddress = storageAddress.toLowerCase();

		const direct = await this.pg.query.entry.findFirst({
			where: and(
				eq(entry.storageAddress, normalizedStorageAddress),
				eq(entry.createdAtHash, hash),
			),
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		if (direct) {
			return direct;
		}

		const joined = await this.pg
			.select({
				id: entry.id,
			})
			.from(entry)
			.innerJoin(relayTx, eq(entry.createdAtTransactionId, relayTx.id))
			.where(
				and(
					eq(entry.storageAddress, normalizedStorageAddress),
					eq(relayTx.hash, hash),
				),
			)
			.limit(1);

		if (!joined[0]?.id) {
			return null;
		}

		return this.getEntry(normalizedStorageAddress as Hex, joined[0].id);
	}

	async getEntryById(id: number) {
		const data = await this.pg.query.entry.findFirst({
			where: eq(entry.id, id),
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});
		return data;
	}

	async getPendingEntries(options?: {
		limit?: number;
		olderThan?: Date;
	}) {
		const limit = options?.limit ?? 100;
		const olderThan = options?.olderThan;
		const whereBase = and(
			isNull(entry.deletedAt),
			or(isNull(entry.onChainId), isNull(entry.createdAtHash)),
		);
		const where = olderThan
			? and(whereBase, lt(entry.createdAt, olderThan))
			: whereBase;

		return this.pg.query.entry.findMany({
			where,
			orderBy: (entry, { desc }) => [desc(entry.createdAt)],
			limit,
		});
	}

	async getPendingWriters(options?: {
		limit?: number;
		olderThan?: Date;
	}) {
		const limit = options?.limit ?? 100;
		const olderThan = options?.olderThan;
		const whereBase = and(
			isNull(writer.deletedAt),
			isNull(writer.createdAtHash),
		);
		const where = olderThan
			? and(whereBase, lt(writer.createdAt, olderThan))
			: whereBase;

		return this.pg.query.writer.findMany({
			where,
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
			limit,
		});
	}

	async getPublicWriters() {
		const publicWriters = await this.pg.query.writer.findMany({
			where: isNull(writer.deletedAt),
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
		});

		if (publicWriters.length === 0) {
			return [];
		}

		const storageAddresses = publicWriters.map((w) =>
			w.storageAddress.toLowerCase(),
		);

		// Get all entries from public writers
		const entries = await this.pg.query.entry.findMany({
			where: and(
				inArray(entry.storageAddress, storageAddresses),
				isNull(entry.deletedAt),
			),
			with: {
				chunks: {
					orderBy: (chunk, { desc }) => [desc(chunk.index)],
				},
			},
		});

		// Group entries by writer and count public/private
		const writerEntryCounts = new Map<
			string,
			{ publicCount: number; privateCount: number }
		>();

		for (const e of entries) {
			const storageAddr = e.storageAddress.toLowerCase();
			const raw = e.chunks.map((c) => c.content).join("");
			const isPrivate = raw.startsWith("enc:");

			const counts = writerEntryCounts.get(storageAddr) ?? {
				publicCount: 0,
				privateCount: 0,
			};
			if (isPrivate) {
				counts.privateCount++;
			} else {
				counts.publicCount++;
			}
			writerEntryCounts.set(storageAddr, counts);
		}

		return publicWriters
			.map((w) => ({
				...w,
				...(writerEntryCounts.get(w.storageAddress.toLowerCase()) ?? {
					publicCount: 0,
					privateCount: 0,
				}),
			}))
			// Include a writer if either:
			//   - it has at least one public (non-encrypted) entry, OR
			//   - it is a public-writable message board (anyone can post),
			//     even if it currently has zero entries — these need to
			//     surface in the explore feed so people can find and write
			//     into them.
			.filter((w) => w.publicCount > 0 || w.publicWritable);
	}

	createTx(tx: Omit<InsertRelayTransaction, "updatedAt" | "createdAt">) {
		// Normalize targetAddress to lowercase so the `getPendingTxsFor`
		// lookup (which also lowercases) matches regardless of casing used
		// at the call site.
		const normalized = {
			...tx,
			targetAddress: tx.targetAddress?.toLowerCase(),
		};
		const { id: _conflictKey, ...createSet } = normalized;
		return this.pg
			.insert(relayTx)
			.values({
				...normalized,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [relayTx.id],
				set: {
					...createSet,
					updatedAt: new Date(),
					createdAt: new Date(),
				},
			})
			.returning();
	}

	upsertTx(item: InsertRelayTransaction) {
		const { id: _conflictKey, ...updateSet } = item;
		return this.pg
			.insert(relayTx)
			.values({
				...item,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [relayTx.id],
				set: { ...updateSet, updatedAt: new Date() },
			})
			.returning();
	}

	async getTxById(id: string) {
		return this.pg.query.relayTx.findFirst({
			where: eq(relayTx.id, id),
		});
	}

	async getTxByHash(hash: string) {
		return this.pg.query.relayTx.findFirst({
			where: eq(relayTx.hash, hash),
		});
	}

	async getPendingTxs(limit = 50) {
		return this.pg.query.relayTx.findMany({
			where: and(
				eq(relayTx.status, "PENDING"),
				isNull(relayTx.hash),
			),
			orderBy: (tx, { asc }) => [asc(tx.createdAt)],
			limit,
		});
	}

	/**
	 * Returns all in-flight relay_tx rows targeting the given writer address.
	 * "In-flight" = PENDING or SUBMITTED (not yet CONFIRMED or ABANDONED).
	 * Used by the pending overlay to surface optimistic state to the read
	 * path until the indexer catches up.
	 *
	 * Ordered by createdAt desc so callers can take the most recent pending
	 * write per (entry, operation) pair in the overlay merge.
	 */
	async getPendingTxsFor(targetAddress: string) {
		const normalized = targetAddress.toLowerCase();
		return this.pg.query.relayTx.findMany({
			where: and(
				eq(relayTx.targetAddress, normalized),
				inArray(relayTx.status, ["PENDING", "SUBMITTED"] as const),
			),
			orderBy: (tx, { desc: d }) => [d(tx.createdAt)],
		});
	}

	/**
	 * Returns all in-flight relay_tx rows matching a given function signature.
	 * Used by the overlay to find pending factory creates when listing writers
	 * for a manager — we can't key those on target_address because the target
	 * is a brand-new writer address that hasn't been joined back to any manager
	 * yet; the managers live inside `args`.
	 */
	async getPendingTxsByFunction(functionSignature: string) {
		return this.pg.query.relayTx.findMany({
			where: and(
				eq(relayTx.functionSignature, functionSignature),
				inArray(relayTx.status, ["PENDING", "SUBMITTED"] as const),
			),
			orderBy: (tx, { desc: d }) => [d(tx.createdAt)],
		});
	}

	upsertWriter(item: InsertWriter) {
		const normalizedManagers = Array.from(
			new Set(item.managers.map((manager) => manager.toLowerCase())),
		);
		// `storageId` is the durable, frozen identifier for this writer (used
		// by v4 encryption key derivation). For new writers it equals
		// storageAddress at creation time. We default to storageAddress here
		// only as a safety net in case a caller forgets to pass it; the
		// indexer should always pass it explicitly.
		const normalizedStorageId = (item.storageId ?? item.storageAddress).toLowerCase();
		const normalizedWriter = {
			...item,
			address: item.address.toLowerCase(),
			storageAddress: item.storageAddress.toLowerCase(),
			storageId: normalizedStorageId,
			admin: item.admin.toLowerCase(),
			managers: normalizedManagers,
		} satisfies InsertWriter;

		// `storageId` is intentionally OMITTED from the conflict update set:
		// it's frozen at insert time and must never change after creation,
		// even if a re-import or a re-org overwrites every other field.
		// `publicWritable` is similarly frozen — the on-chain field is
		// `immutable`, so the DB copy should match.
		// `legacyDomain` is NOT frozen here — it defaults to true on insert
		// (for old-factory writers) or false (for new-factory writers), but
		// CAN be flipped to false later by the indexer's LogicSet handler
		// when a writer's logic is migrated. That flip happens via a separate
		// UPDATE (updateWriterAddressByStorage), not via upsertWriter, so
		// we still strip it from the conflict update set to prevent a
		// re-index from accidentally reverting a flipped value.
		const {
			address: _conflictKey,
			storageId: _frozenStorageId,
			publicWritable: _frozenPublic,
			legacyDomain: _frozenLegacy,
			...mutableFields
		} = normalizedWriter;

		return this.pg
			.insert(writer)
			.values({
				...normalizedWriter,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [writer.address],
				set: {
					...mutableFields,
					updatedAt: new Date(),
				},
			})
			.returning();
	}

	async upsertEntry(item: InsertEntry) {
		// `storageId` is the frozen, durable identifier for the writer this
		// entry belongs to. At v1 it equals storageAddress; for migrated
		// writers it would be the original storageAddress preserved across
		// the migration. Defaults to storageAddress if the caller forgets.
		const normalizedStorageId = (item.storageId ?? item.storageAddress).toLowerCase();
		const normalizedEntry = {
			...item,
			author: item.author.toLowerCase(),
			storageAddress: item.storageAddress.toLowerCase(),
			storageId: normalizedStorageId,
		} satisfies InsertEntry;

		// Prefer the (storageAddress, onChainId) composite index when
		// onChainId is available — it's the true on-chain identity of the
		// entry and avoids collisions when re-indexing with a different
		// createdAtTransactionId than the original insert. Fall back to
		// createdAtTransactionId for pending entries (no onChainId yet),
		// and finally to the DB serial id.
		const conflictTarget = normalizedEntry.onChainId != null
			? [entry.storageAddress, entry.onChainId]
			: normalizedEntry.id
				? [entry.id]
				: normalizedEntry.createdAtTransactionId
					? [entry.createdAtTransactionId]
					: [entry.storageAddress, entry.onChainId];

		// Strip frozen fields and conflict-target columns from the update
		// set. Conflict target columns can't appear in SET (Postgres
		// requirement), and frozen fields must never change after insert.
		const {
			storageId: _frozenStorageId,
			id: _id,
			storageAddress: _sa,
			onChainId: _ocid,
			createdAtTransactionId: _catid,
			...mutableFields
		} = normalizedEntry;

		// Don't overwrite non-null transaction ID fields with null during
		// re-indexing (same rationale as upsertChunk). Only include them
		// in the update set when they carry a real value.
		const conflictSet: Record<string, unknown> = {
			...mutableFields,
			updatedAt: new Date(),
		};
		for (const key of [
			"createdAtTransactionId",
			"updatedAtTransactionId",
			"deletedAtTransactionId",
		] as const) {
			if (normalizedEntry[key] != null) {
				conflictSet[key] = normalizedEntry[key];
			}
		}

		const data = await this.pg
			.insert(entry)
			.values({
				...normalizedEntry,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: conflictTarget,
				set: conflictSet,
			})
			.returning();
		return Promise.all(
			data.map(({ storageAddress, id }) =>
				this.getEntry(storageAddress as Hex, id),
			),
		);
	}

	deleteEntry(address: Hex, id: bigint, transactionId: string) {
		return this.pg
			.update(entry)
			.set({ deletedAt: new Date(), deletedAtTransactionId: transactionId })
			.where(
				and(
					eq(entry.storageAddress, address.toLowerCase()),
					eq(entry.onChainId, id),
				),
			);
	}

	upsertUser(item: InsertUser) {
		const normalizedAddress = item.address.toLowerCase();
		const { address: _conflictKey, ...updateFields } = item;
		return this.pg
			.insert(user)
			.values({
				...item,
				address: normalizedAddress,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [user.address],
				set: { ...updateFields, updatedAt: new Date() },
			})
			.returning();
	}

	async getUser(address: Hex) {
		const normalizedAddress = address.toLowerCase();
		const data = await this.pg.query.user.findFirst({
			where: eq(user.address, normalizedAddress),
		});
		return data;
	}

	saveWriter(userAddress: Hex, writerAddress: Hex) {
		return this.pg
			.insert(savedWriter)
			.values({
				userAddress: userAddress.toLowerCase(),
				writerAddress: writerAddress.toLowerCase(),
				createdAt: new Date(),
			})
			.onConflictDoNothing();
	}

	unsaveWriter(userAddress: Hex, writerAddress: Hex) {
		return this.pg
			.delete(savedWriter)
			.where(
				and(
					eq(savedWriter.userAddress, userAddress.toLowerCase()),
					eq(savedWriter.writerAddress, writerAddress.toLowerCase()),
				),
			);
	}

	saveEntry(userAddress: Hex, entryId: number) {
		return this.pg
			.insert(savedEntry)
			.values({
				userAddress: userAddress.toLowerCase(),
				entryId,
				createdAt: new Date(),
			})
			.onConflictDoNothing();
	}

	unsaveEntry(userAddress: Hex, entryId: number) {
		return this.pg
			.delete(savedEntry)
			.where(
				and(
					eq(savedEntry.userAddress, userAddress.toLowerCase()),
					eq(savedEntry.entryId, entryId),
				),
			);
	}

	async getSaved(userAddress: Hex) {
		const normalizedAddress = userAddress.toLowerCase();
		const [savedWriterRows, savedEntryRows] = await Promise.all([
			this.pg.query.savedWriter.findMany({
				where: eq(savedWriter.userAddress, normalizedAddress),
				orderBy: (savedWriter, { desc }) => [desc(savedWriter.createdAt)],
			}),
			this.pg.query.savedEntry.findMany({
				where: eq(savedEntry.userAddress, normalizedAddress),
				orderBy: (savedEntry, { desc }) => [desc(savedEntry.createdAt)],
			}),
		]);

		const writerAddresses = savedWriterRows.map((row) => row.writerAddress);
		const writers =
			writerAddresses.length > 0
				? await this.pg.query.writer.findMany({
						where: and(
							inArray(writer.address, writerAddresses),
							isNull(writer.deletedAt),
						),
					})
				: [];
		const writerMap = new Map(writers.map((item) => [item.address, item]));
		const writerStorageAddresses = Array.from(
			new Set(writers.map((item) => item.storageAddress.toLowerCase())),
		);
		const writerEntries =
			writerStorageAddresses.length > 0
				? await this.pg.query.entry.findMany({
						where: and(
							inArray(entry.storageAddress, writerStorageAddresses),
							isNull(entry.deletedAt),
						),
						columns: {
							id: true,
							storageAddress: true,
						},
					})
				: [];
		const writerEntryCountMap = new Map<string, number>();
		for (const item of writerEntries) {
			const storageAddress = item.storageAddress.toLowerCase();
			const current = writerEntryCountMap.get(storageAddress) ?? 0;
			writerEntryCountMap.set(storageAddress, current + 1);
		}

		const savedWriters = savedWriterRows
			.map((row) => {
				const data = writerMap.get(row.writerAddress);
				if (!data) return null;
				return {
					writer: data,
					savedAt: row.createdAt,
					entryCount:
						writerEntryCountMap.get(data.storageAddress.toLowerCase()) ?? 0,
				};
			})
			.filter(
				(
					row,
				): row is { writer: SelectWriter; savedAt: Date; entryCount: number } =>
					!!row,
			);

		const entryIds = savedEntryRows.map((row) => row.entryId);
		const entries =
			entryIds.length > 0
				? await this.pg.query.entry.findMany({
						where: and(inArray(entry.id, entryIds), isNull(entry.deletedAt)),
						with: {
							chunks: {
								orderBy: (chunk, { desc }) => [desc(chunk.index)],
							},
						},
					})
				: [];
		const entryMap = new Map(entries.map((item) => [item.id, item]));

		const entryStorageAddresses = Array.from(
			new Set(entries.map((item) => item.storageAddress.toLowerCase())),
		);
		const entryWriters =
			entryStorageAddresses.length > 0
				? await this.pg.query.writer.findMany({
						where: and(
							inArray(writer.storageAddress, entryStorageAddresses),
							isNull(writer.deletedAt),
						),
					})
				: [];
		const entryWriterMap = new Map(
			entryWriters.map((item) => [item.storageAddress.toLowerCase(), item]),
		);

		const savedEntries = savedEntryRows
			.map((row) => {
				const data = entryMap.get(row.entryId);
				if (!data) return null;
				const dataWriter = entryWriterMap.get(
					data.storageAddress.toLowerCase(),
				);
				if (!dataWriter) return null;
				return {
					entry: data,
					writer: dataWriter,
					savedAt: row.createdAt,
				};
			})
			.filter(
				(
					row,
				): row is {
					entry: EntryWithChunks;
					writer: SelectWriter;
					savedAt: Date;
				} => !!row,
			);

		return {
			writers: savedWriters,
			entries: savedEntries,
		};
	}

	async upsertChunk(item: InsertChunk) {
		try {
			// Primary path: upsert on (entryId, index). Handles the normal
			// case where the server pre-creates the chunk (instant UI update)
			// and the indexer later reconciles with on-chain data — both use
			// the same entryId because upsertEntry reconciled the entry row
			// by createdAtTransactionId first.
			// Build the conflict-update set. Never overwrite a non-null
			// createdAtTransactionId with null — this happens during
			// re-indexing when the ingestor replays historical chunks
			// whose original relay_tx used the old Syndicate UUID format
			// (not matchable via dw:{wallet}:{nonce}).
			const { entryId: _eid, index: _idx, ...updateFields } = item;
			const conflictSet: Record<string, unknown> = { ...updateFields };
			if (item.createdAtTransactionId == null) {
				delete conflictSet.createdAtTransactionId;
			}
			return await this.pg
				.insert(chunk)
				.values({ ...item, createdAt: new Date() })
				.onConflictDoUpdate({
					target: [chunk.entryId, chunk.index],
					set: conflictSet,
				})
				.returning();
		} catch (err) {
			// Drizzle's onConflictDoUpdate with column targets can fail to
			// match the named unique index (entry_index_idx) due to casing
			// mode interactions. If the (entryId, index) conflict fires as
			// an error instead of being caught, fall back to an explicit
			// UPDATE.
			const isEntryIndexViolation =
				err instanceof Error &&
				err.message.includes("entry_index_idx");
			if (isEntryIndexViolation) {
				const { entryId: _eid2, index: _idx2, ...fields } = item;
				if (item.createdAtTransactionId == null) {
					const { createdAtTransactionId: _skip, ...safeFields } = fields;
					return await this.pg
						.update(chunk)
						.set(safeFields)
						.where(
							and(
								eq(chunk.entryId, item.entryId),
								eq(chunk.index, item.index),
							),
						)
						.returning();
				}
				return await this.pg
					.update(chunk)
					.set(fields)
					.where(
						and(
							eq(chunk.entryId, item.entryId),
							eq(chunk.index, item.index),
						),
					)
					.returning();
			}
			// Fallback: if (entryId, index) didn't conflict but
			// createdAtTransactionId did, it means the server and indexer
			// resolved the same on-chain entry to different DB rows (e.g.,
			// from migration retries or reconciliation edge cases). The
			// chunk already exists under a different entryId for the same
			// relay tx — update it by transactionId instead of duplicating.
			const isUniqueViolation =
				err instanceof Error &&
				err.message.includes("chunk_createdAtTransactionId_unique");
			if (!isUniqueViolation || !item.createdAtTransactionId) {
				throw err;
			}
			return await this.pg
				.update(chunk)
				.set({ ...item })
				.where(eq(chunk.createdAtTransactionId, item.createdAtTransactionId))
				.returning();
		}
	}

	deleteWriter(address: Hex) {
		return this.pg
			.update(writer)
			.set({ deletedAt: new Date() })
			.where(eq(writer.address, address.toLowerCase()));
	}

	/**
	 * Re-point a writer row at a new logic-contract address. Driven by the
	 * `WriterStorage.LogicSet` event in the indexer when a Writer is migrated
	 * to a fixed logic contract. Looks up the row by `storage_address` (which
	 * is stable across migrations) and overwrites `address`. The
	 * `saved_writer.writer_address` foreign key is `ON UPDATE CASCADE`, so
	 * saved references follow the new address automatically.
	 *
	 * Also flips `legacyDomain` to `false`: a logic migration means the
	 * Writer now uses the chain-portable EIP-712 domain (no chainId), so
	 * the frontend should stop including chainId when signing for this
	 * writer.
	 *
	 * Returns the number of rows updated. Zero is a valid result during the
	 * factory's construction-time `LogicSet` (which fires before the
	 * `WriterCreated` handler creates the row); the caller should treat that
	 * as a no-op.
	 */
	async updateWriterAddressByStorage(
		storageAddress: Hex,
		newAddress: Hex,
	): Promise<number> {
		const normalizedStorage = storageAddress.toLowerCase();
		const normalizedNew = newAddress.toLowerCase();
		const result = await this.pg
			.update(writer)
			.set({
				address: normalizedNew,
				legacyDomain: false,
				updatedAt: new Date(),
			})
			.where(eq(writer.storageAddress, normalizedStorage))
			.returning({ address: writer.address });
		return result.length;
	}

	// -----------------------------------------------------------------------
	// Ingestor cursor
	// -----------------------------------------------------------------------

	async getAllStorageAddresses(): Promise<string[]> {
		const rows = await this.pg
			.selectDistinct({ storageAddress: writer.storageAddress })
			.from(writer);
		return rows.map((r) => r.storageAddress);
	}

	async getCursor(): Promise<bigint | null> {
		const row = await this.pg.query.ingestorCursor.findFirst({
			where: eq(ingestorCursor.id, 1),
		});
		return row?.lastBlock ?? null;
	}

	async setCursor(blockNumber: bigint): Promise<void> {
		await this.pg
			.insert(ingestorCursor)
			.values({ id: 1, lastBlock: blockNumber, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: [ingestorCursor.id],
				set: { lastBlock: blockNumber, updatedAt: new Date() },
			});
	}
}

export function writerToJsonSafe(data: SelectWriter) {
	return {
		...data,
		createdAtBlock: data.createdAtBlock?.toString(),
	};
}

export function entryToJsonSafe({ chunks, ...data }: EntryWithChunks) {
	const raw = chunks.map((c) => c.content).join("");
	const { version, decompressed } = processRawContent(raw);
	return {
		...data,
		chunks,
		raw,
		version,
		decompressed,
		onChainId: data.onChainId?.toString(),
		createdAtBlock: data.createdAtBlock?.toString(),
		deletedAtBlock: data.deletedAtBlock?.toString(),
		updatedAtBlock: data.updatedAtBlock?.toString(),
	};
}

type SelectWriter = typeof writer.$inferSelect;
type SelectEntry = typeof entry.$inferSelect;
type SelectChunk = typeof chunk.$inferSelect;
type SelectSavedWriter = typeof savedWriter.$inferSelect;
type SelectSavedEntry = typeof savedEntry.$inferSelect;
// `storageId` is omitted-and-redeclared as optional so callers can omit it
// (the upsertWriter helper defaults it to storageAddress). The underlying
// column is still NOT NULL — the default just happens at the Db boundary.
// `publicWritable` is also optional at the boundary (defaults to false in
// the column DDL); callers that know about it should still pass it.
type InsertWriter = Omit<
	typeof writer.$inferInsert,
	"createdAt" | "updatedAt" | "storageId"
> & {
	storageId?: string;
};
type InsertRelayTransaction = Omit<
	typeof relayTx.$inferInsert,
	"updatedAt" | "createdAt"
>;
// `storageId` is omitted-and-redeclared as optional so callers can omit it
// (the upsertEntry helper defaults it to storageAddress). The underlying
// column is still NOT NULL — the default just happens at the Db boundary.
type InsertEntry = Omit<
	typeof entry.$inferInsert,
	"createdAt" | "updatedAt" | "storageId"
> & {
	storageId?: string;
};
type InsertUser = Omit<typeof user.$inferInsert, "createdAt" | "updatedAt">;
type InsertChunk = Omit<typeof chunk.$inferInsert, "createdAt">;
type EntryWithChunks = SelectEntry & {
	chunks: SelectChunk[];
};
type PublicWriterWithCounts = SelectWriter & {
	publicCount: number;
	privateCount: number;
};

export function publicWriterToJsonSafe(data: PublicWriterWithCounts) {
	return {
		address: data.address,
		title: data.title,
		admin: data.admin,
		publicCount: data.publicCount,
		privateCount: data.privateCount,
		publicWritable: data.publicWritable,
		createdAt: data.createdAt,
		createdAtBlock: data.createdAtBlock?.toString(),
	};
}

type SavedWriterWithWriter = {
	writer: SelectWriter;
	savedAt: SelectSavedWriter["createdAt"];
	entryCount: number;
};

type SavedEntryWithWriter = {
	entry: EntryWithChunks;
	writer: SelectWriter;
	savedAt: SelectSavedEntry["createdAt"];
};

export function savedWriterToJsonSafe(data: SavedWriterWithWriter) {
	return {
		writer: writerToJsonSafe(data.writer),
		savedAt: data.savedAt,
		entryCount: data.entryCount,
	};
}

export function savedEntryToJsonSafe(data: SavedEntryWithWriter) {
	return {
		entry: entryToJsonSafe(data.entry),
		writer: writerToJsonSafe(data.writer),
		savedAt: data.savedAt,
	};
}

export { Db };
