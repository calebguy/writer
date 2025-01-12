import { relations } from "drizzle-orm/relations";
import { entry, syndicateTx, writer } from "./schema";

export const writerRelations = relations(writer, ({ one, many }) => ({
	syndicateTransaction: one(syndicateTx, {
		fields: [writer.transactionId],
		references: [syndicateTx.id],
	}),
}));

export const syndicateTxRelations = relations(syndicateTx, ({ many }) => ({
	writers: many(writer),
	entries: many(entry),
}));

export const entryRelations = relations(entry, ({ one }) => ({
	createdAtTransaction: one(syndicateTx, {
		fields: [entry.createdAtTransactionId],
		references: [syndicateTx.id],
	}),
	deletedAtTransaction: one(syndicateTx, {
		fields: [entry.deletedAtTransactionId],
		references: [syndicateTx.id],
	}),
}));
