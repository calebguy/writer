import { and, arrayContains, eq, inArray, isNull, notLike, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { processRawContent } from "utils";
import type { Hex } from "viem";
import {
	chunkRelations,
	entryRelations,
	syndicateTxRelations,
	writerRelations,
} from "./src/relations";
import { chunk, entry, syndicateTx, user, writer } from "./src/schema";

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
				writerRelations,
				entryRelations,
				chunkRelations,
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

	async getPublicWriters() {
		// Get all non-private writers
		const publicWriters = await this.pg.query.writer.findMany({
			where: and(
				eq(writer.isPrivate, false),
				isNull(writer.deletedAt),
			),
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
		});

		if (publicWriters.length === 0) {
			return [];
		}

		const storageAddresses = publicWriters.map((w) => w.storageAddress.toLowerCase());

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
		const writerEntryCounts = new Map<string, { publicCount: number; privateCount: number }>();

		for (const e of entries) {
			const storageAddr = e.storageAddress.toLowerCase();
			const raw = e.chunks.map((c) => c.content).join("");
			const isPrivate = raw.startsWith("enc:");

			const counts = writerEntryCounts.get(storageAddr) ?? { publicCount: 0, privateCount: 0 };
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
				...writerEntryCounts.get(w.storageAddress.toLowerCase()) ?? { publicCount: 0, privateCount: 0 },
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
		if (item.transactionId) {
			return this.pg
				.insert(writer)
				.values({
					...item,
					updatedAt: new Date(),
					createdAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [writer.transactionId],
					set: { ...item, updatedAt: new Date() },
				})
				.returning();
		}

		return this.pg
			.insert(writer)
			.values({
				...item,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [writer.address],
				set: {
					...item,
					updatedAt: new Date(),
				},
			})
			.returning();
	}

	async upsertEntry(item: InsertEntry) {
		const data = await this.pg
			.insert(entry)
			.values({
				...item,
				updatedAt: new Date(),
				createdAt: new Date(),
			})
			.onConflictDoUpdate({
				target: item.createdAtTransactionId
					? [entry.createdAtTransactionId]
					: [entry.storageAddress, entry.onChainId],
				set: {
					...item,
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

export { Db };
