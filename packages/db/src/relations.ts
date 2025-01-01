import { relations } from "drizzle-orm/relations";
import { entry, syndicateTx, writer } from "./schema";

export const writerRelations = relations(writer, ({ one, many }) => ({
	syndicateTransaction: one(syndicateTx, {
		fields: [writer.transactionId],
		references: [syndicateTx.id],
	}),
	entries: many(entry),
}));

export const syndicateTransactionRelations = relations(
	syndicateTx,
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
	syndicateTransaction: one(syndicateTx, {
		fields: [entry.transactionId],
		references: [syndicateTx.id],
	}),
}));
