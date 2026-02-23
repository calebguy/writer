import {
	and,
	arrayContains,
	desc,
	eq,
	inArray,
	isNull,
	notLike,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { processRawContent } from "utils";
import type { Hex } from "viem";
import {
	chunkRelations,
	entryRelations,
	savedEntryRelations,
	savedWriterRelations,
	syndicateTxRelations,
	writerRelations,
} from "./src/relations";
import {
	chunk,
	entry,
	savedEntry,
	savedWriter,
	syndicateTx,
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
				syndicateTx,
				user,
				chunk,
				savedWriter,
				savedEntry,
				writerRelations,
				entryRelations,
				chunkRelations,
				savedWriterRelations,
				savedEntryRelations,
				syndicateTransactionRelations: syndicateTxRelations,
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

	async getPublicWriters() {
		// Get all non-private writers
		const publicWriters = await this.pg.query.writer.findMany({
			where: and(eq(writer.isPrivate, false), isNull(writer.deletedAt)),
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
			.filter((w) => w.publicCount > 0);
	}

	createTx(tx: Omit<InsertSyndicateTransaction, "updatedAt" | "createdAt">) {
		return this.pg
			.insert(syndicateTx)
			.values({
				...tx,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.returning();
	}

	upsertTx(item: InsertSyndicateTransaction) {
		return this.pg
			.insert(syndicateTx)
			.values({
				...item,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [syndicateTx.id],
				set: { ...item, updatedAt: new Date() },
			})
			.returning();
	}

	upsertWriter(item: InsertWriter) {
		const normalizedManagers = Array.from(
			new Set(item.managers.map((manager) => manager.toLowerCase())),
		);
		const normalizedWriter = {
			...item,
			address: item.address.toLowerCase(),
			storageAddress: item.storageAddress.toLowerCase(),
			admin: item.admin.toLowerCase(),
			managers: normalizedManagers,
		} satisfies InsertWriter;

		if (item.transactionId) {
			return this.pg
				.insert(writer)
				.values({
					...normalizedWriter,
					updatedAt: new Date(),
					createdAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [writer.transactionId],
					set: { ...normalizedWriter, updatedAt: new Date() },
				})
				.returning();
		}

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
					...normalizedWriter,
					updatedAt: new Date(),
				},
			})
			.returning();
	}

	async upsertEntry(item: InsertEntry) {
		const normalizedEntry = {
			...item,
			author: item.author.toLowerCase(),
			storageAddress: item.storageAddress.toLowerCase(),
		} satisfies InsertEntry;

		const data = await this.pg
			.insert(entry)
			.values({
				...normalizedEntry,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: normalizedEntry.createdAtTransactionId
					? [entry.createdAtTransactionId]
					: [entry.storageAddress, entry.onChainId],
				set: {
					...normalizedEntry,
					updatedAt: new Date(),
				},
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
		return this.pg
			.insert(user)
			.values({
				...item,
				address: normalizedAddress,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [user.address],
				set: { ...item, address: normalizedAddress, updatedAt: new Date() },
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

		const savedWriters = savedWriterRows
			.map((row) => {
				const data = writerMap.get(row.writerAddress);
				if (!data) return null;
				return {
					writer: data,
					savedAt: row.createdAt,
				};
			})
			.filter((row): row is { writer: SelectWriter; savedAt: Date } => !!row);

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

	upsertChunk(item: InsertChunk) {
		return this.pg
			.insert(chunk)
			.values({ ...item, createdAt: new Date() })
			.onConflictDoUpdate({
				target: [chunk.entryId, chunk.index],
				set: { ...item },
			})
			.returning();
	}

	deleteWriter(address: Hex) {
		return this.pg
			.update(writer)
			.set({ deletedAt: new Date() })
			.where(eq(writer.address, address.toLowerCase()));
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
type InsertWriter = Omit<typeof writer.$inferInsert, "createdAt" | "updatedAt">;
type InsertSyndicateTransaction = Omit<
	typeof syndicateTx.$inferInsert,
	"updatedAt" | "createdAt"
>;
type InsertEntry = Omit<typeof entry.$inferInsert, "createdAt" | "updatedAt">;
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
		createdAt: data.createdAt,
		createdAtBlock: data.createdAtBlock?.toString(),
	};
}

type SavedWriterWithWriter = {
	writer: SelectWriter;
	savedAt: SelectSavedWriter["createdAt"];
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
