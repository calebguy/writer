import { and, arrayContains, eq, inArray, isNull } from "drizzle-orm";
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
			where: arrayContains(writer.managers, [managerAddress]),
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
		});
		const storageAddresses = writers
			.filter((w) => w.storageAddress !== null)
			.map((w) => w.storageAddress) as string[];
		const entries = await this.pg.query.entry.findMany({
			where: and(
				inArray(entry.storageAddress, storageAddresses),
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
			where: eq(writer.address, address),
		});
		if (!data) {
			return null;
		}
		const entries = await this.pg.query.entry.findMany({
			where: and(
				eq(entry.storageAddress, data.storageAddress),
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
			where: and(eq(entry.storageAddress, storageAddress), eq(entry.id, id)),
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
				eq(entry.storageAddress, storageAddress),
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
			.where(and(eq(entry.storageAddress, address), eq(entry.onChainId, id)));
	}

	upsertUser(item: InsertUser) {
		return this.pg
			.insert(user)
			.values({
				...item,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [user.address],
				set: { ...item, updatedAt: new Date() },
			})
			.returning();
	}

	async getUser(address: Hex) {
		const data = await this.pg.query.user.findFirst({
			where: eq(user.address, address),
		});
		return data;
	}

	upsertChunk(item: InsertChunk) {
		return this.pg
			.insert(chunk)
			.values({ ...item, createdAt: new Date() })
			.returning();
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
	console.log("raw", raw, data.onChainId, data.storageAddress);
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
export { Db };
