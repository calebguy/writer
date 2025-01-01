import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Hex } from "viem";
import {
	entryRelations,
	syndicateTransactionRelations,
	writerRelations,
} from "./src/relations";
import { entry, syndicateTx, writer } from "./src/schema";

class Db {
	private pg;

	constructor(private readonly connectionUrl: string) {
		this.pg = drizzle({
			connection: this.connectionUrl,
			schema: {
				writer,
				entry,
				syndicateTransaction: syndicateTx,
				writerRelations,
				entryRelations,
				syndicateTransactionRelations,
			},
		});
	}

	getWriter(address: Hex) {
		return this.pg.query.writer.findFirst({
			where: eq(writer.address, address),
			with: {
				entries: {
					orderBy: (entries, { desc }) => [desc(entries.onChainId)],
				},
				syndicateTransaction: true,
			},
		});
	}

	getWriters(address: Hex) {
		return this.pg.query.writer.findMany({
			where: eq(writer.admin, address),
			with: {
				entries: {
					orderBy: (entries, { desc }) => [desc(entries.onChainId)],
				},
				syndicateTransaction: true,
			},
		});
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

	createWriter(item: InsertWriter) {
		return this.pg
			.insert(writer)
			.values({
				...item,
				updatedAt: new Date(),
				createdAt: new Date(),
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

	createEntry(item: InsertEntry) {
		return this.pg
			.insert(entry)
			.values({
				...item,
				updatedAt: new Date(),
				createdAt: new Date(),
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
				target: [entry.onChainId],
				set: {
					...item,
					updatedAt: new Date(),
				},
			})
			.returning();
	}
}

// export function writerToJsonSafe({
// 	onChainId,
// 	...writer
// }: Prisma.WriterGetPayload<{
// 	include: { transaction: true; entries: true };
// }>) {
// 	return {
// 		...writer,
// 		onChainId: onChainId?.toString(),
// 		transaction: writer.transaction
// 			? {
// 					...writer.transaction,
// 					chainId: writer.transaction.chainId.toString(),
// 					blockNumber: writer.transaction.blockNumber?.toString(),
// 				}
// 			: null,
// 		entries: writer.entries.map((entry) => ({
// 			...entry,
// 			onChainId: entry.onChainId?.toString(),
// 		})),
// 	};
// }

type InsertWriter = Omit<typeof writer.$inferInsert, "createdAt" | "updatedAt">;
type InsertSyndicateTransaction = Omit<
	typeof syndicateTx.$inferInsert,
	"updatedAt" | "createdAt"
>;
type InsertEntry = Omit<typeof entry.$inferInsert, "createdAt" | "updatedAt">;

export { Db };
