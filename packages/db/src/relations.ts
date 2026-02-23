import { relations } from "drizzle-orm/relations";
import {
	chunk,
	entry,
	savedEntry,
	savedWriter,
	syndicateTx,
	writer,
} from "./schema";

export const writerRelations = relations(writer, ({ one }) => ({
	syndicateTransaction: one(syndicateTx, {
		fields: [writer.transactionId],
		references: [syndicateTx.id],
	}),
}));

export const syndicateTxRelations = relations(syndicateTx, ({ many }) => ({
	writers: many(writer),
	entries: many(entry),
}));

export const entryRelations = relations(entry, ({ one, many }) => ({
	createdAtTransaction: one(syndicateTx, {
		fields: [entry.createdAtTransactionId],
		references: [syndicateTx.id],
	}),
	deletedAtTransaction: one(syndicateTx, {
		fields: [entry.deletedAtTransactionId],
		references: [syndicateTx.id],
	}),
	updatedAtTransaction: one(syndicateTx, {
		fields: [entry.updatedAtTransactionId],
		references: [syndicateTx.id],
	}),
	chunks: many(chunk),
}));

export const chunkRelations = relations(chunk, ({ one }) => ({
	createdAtTransaction: one(syndicateTx, {
		fields: [chunk.createdAtTransactionId],
		references: [syndicateTx.id],
	}),
	entry: one(entry, {
		fields: [chunk.entryId],
		references: [entry.id],
	}),
}));

export const savedWriterRelations = relations(savedWriter, ({ one }) => ({
	writer: one(writer, {
		fields: [savedWriter.writerAddress],
		references: [writer.address],
	}),
}));

export const savedEntryRelations = relations(savedEntry, ({ one }) => ({
	entry: one(entry, {
		fields: [savedEntry.entryId],
		references: [entry.id],
	}),
}));
