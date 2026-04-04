import { relations } from "drizzle-orm/relations";
import {
	chunk,
	entry,
	savedEntry,
	savedWriter,
	relayTx,
	writer,
} from "./schema";

export const writerRelations = relations(writer, ({ one }) => ({
	relayTransaction: one(relayTx, {
		fields: [writer.transactionId],
		references: [relayTx.id],
	}),
}));

export const relayTxRelations = relations(relayTx, ({ many }) => ({
	writers: many(writer),
	entries: many(entry),
}));

export const entryRelations = relations(entry, ({ one, many }) => ({
	createdAtTransaction: one(relayTx, {
		fields: [entry.createdAtTransactionId],
		references: [relayTx.id],
	}),
	deletedAtTransaction: one(relayTx, {
		fields: [entry.deletedAtTransactionId],
		references: [relayTx.id],
	}),
	updatedAtTransaction: one(relayTx, {
		fields: [entry.updatedAtTransactionId],
		references: [relayTx.id],
	}),
	chunks: many(chunk),
}));

export const chunkRelations = relations(chunk, ({ one }) => ({
	createdAtTransaction: one(relayTx, {
		fields: [chunk.createdAtTransactionId],
		references: [relayTx.id],
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
