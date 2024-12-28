import { relations } from "drizzle-orm/relations";
import { entry, syndicateTransaction, writer } from "./schema";

export const writerRelations = relations(writer, ({ one, many }) => ({
	syndicateTransaction: one(syndicateTransaction, {
		fields: [writer.transactionId],
		references: [syndicateTransaction.id],
	}),
	entries: many(entry),
}));

export const syndicateTransactionRelations = relations(
	syndicateTransaction,
	({ many }) => ({
		writers: many(writer),
		entries: many(entry),
	}),
);

export const entryRelations = relations(entry, ({ one }) => ({
	writer: one(writer, {
		fields: [entry.writerId],
		references: [writer.id],
	}),
	syndicateTransaction: one(syndicateTransaction, {
		fields: [entry.transactionId],
		references: [syndicateTransaction.id],
	}),
}));
