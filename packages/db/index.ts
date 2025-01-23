import { and, arrayContains, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Hex } from "viem";
import {
	entryRelations,
	syndicateTxRelations,
	writerRelations,
} from "./src/relations";
import { entry, syndicateTx, writer } from "./src/schema";

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
				writerRelations,
				entryRelations,
				syndicateTransactionRelations: syndicateTxRelations,
			},
		});
	}

	async getWritersByManager(address: Hex) {
		const writers = await this.pg.query.writer.findMany({
			where: arrayContains(writer.managers, [address]),
			orderBy: (writer, { desc }) => [desc(writer.createdAt)],
		});
		const entries = await this.pg.query.entry.findMany({
			where: and(
				inArray(
					entry.storageAddress,
					writers
						.filter((w) => w.storageAddress !== null)
						.map((w) => w.storageAddress) as string[],
				),
				isNull(entry.deletedAt),
			),
			orderBy: (entry, { desc }) => [desc(entry.createdAt)],
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
		});
		return {
			...data,
			entries,
		};
	}

	async getEntry(address: Hex, id: bigint) {
		const data = await this.pg.query.entry.findFirst({
			where: and(eq(entry.storageAddress, address), eq(entry.onChainId, id)),
		});
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

	upsertEntry(item: InsertEntry) {
		return this.pg
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
	}

	deleteEntry(address: Hex, id: bigint, transactionId: string) {
		return this.pg
			.update(entry)
			.set({ deletedAt: new Date(), deletedAtTransactionId: transactionId })
			.where(and(eq(entry.storageAddress, address), eq(entry.onChainId, id)));
	}
}

export function writerToJsonSafe(data: SelectWriter) {
	return {
		...data,
		createdAtBlock: data.createdAtBlock?.toString(),
	};
}

export function entryToJsonSafe(data: typeof entry.$inferSelect) {
	return {
		...data,
		onChainId: data.onChainId?.toString(),
		createdAtBlock: data.createdAtBlock?.toString(),
		deletedAtBlock: data.deletedAtBlock?.toString(),
	};
}

type SelectWriter = typeof writer.$inferSelect;
type InsertWriter = Omit<typeof writer.$inferInsert, "createdAt" | "updatedAt">;
type InsertSyndicateTransaction = Omit<
	typeof syndicateTx.$inferInsert,
	"updatedAt" | "createdAt"
>;
type InsertEntry = Omit<typeof entry.$inferInsert, "createdAt" | "updatedAt">;

export { Db };
