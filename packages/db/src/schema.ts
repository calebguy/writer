import {
	bigint,
	boolean,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

export const writer = pgTable("writer", {
	id: serial().primaryKey(),
	title: text().notNull(),
	address: varchar({ length: 42 }).unique(),
	storageAddress: varchar({ length: 42 }).unique(),
	admin: text().notNull(),
	managers: text().array().notNull(),
	onChainId: bigint({ mode: "bigint" }).unique(),
	createdAtHash: text(),
	createdAtBlock: bigint({ mode: "bigint" }),
	createdAtBlockDatetime: timestamp({
		withTimezone: true,
	}),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
	transactionId: varchar({ length: 255 })
		.unique()
		.references(() => syndicateTransaction.id),
});

export const entry = pgTable(
	"entry",
	{
		id: serial().primaryKey(),
		exists: boolean().notNull(),
		onChainId: bigint({ mode: "bigint" }),
		content: text(),
		createdAtHash: text(),
		createdAtBlock: bigint({ mode: "bigint" }),
		createdAtBlockDatetime: timestamp({
			withTimezone: true,
		}),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true }).notNull(),
		writerId: integer()
			.notNull()
			.references(() => writer.id),
		transactionId: varchar({ length: 255 })
			.unique()
			.references(() => syndicateTransaction.id),
	},
	(entries) => ({
		onChainWriterIndex: uniqueIndex("entries_on_chain_writer_idx").on(
			entries.onChainId,
			entries.writerId,
		),
	}),
);

export const requestStatus = pgEnum("request_status", [
	"PENDING",
	"PROCESSED",
	"SUBMITTED",
	"CONFIRMED",
	"PAUSED",
	"ABANDONED",
]);

export const syndicateTransaction = pgTable("syndicate_transaction", {
	id: varchar("id", { length: 255 }).primaryKey(),
	chainId: bigint({ mode: "bigint" }).notNull(),
	blockNumber: bigint({ mode: "bigint" }),
	hash: text(),
	status: requestStatus().default("PENDING").notNull(),
	functionSignature: text().notNull(),
	args: jsonb().notNull(),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
});

// Relations (to be handled in your ORM logic or queries)
// Writer.entries -> Entry.writerId
// Writer.transactionId -> SyndicateTransaction.id
// Entry.transactionId -> SyndicateTransaction.id
