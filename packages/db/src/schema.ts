import {
	bigint,
	boolean,
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
	address: varchar({ length: 42 }).primaryKey(),
	storageAddress: varchar({ length: 42 }).unique().notNull(),
	title: text().notNull(),
	admin: text().notNull(),
	managers: text().array().notNull(),
	createdAtHash: text(),
	createdAtBlock: bigint({ mode: "bigint" }),
	createdAtBlockDatetime: timestamp({
		withTimezone: true,
	}),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
	transactionId: varchar({ length: 255 })
		.unique()
		.references(() => syndicateTx.id),
});

export const entry = pgTable(
	"entry",
	{
		id: serial().primaryKey(),
		exists: boolean().notNull(),
		onChainId: bigint({ mode: "bigint" }),
		content: text(),
		author: text().notNull(),
		createdAtHash: text(),
		createdAtBlock: bigint({ mode: "bigint" }),
		createdAtBlockDatetime: timestamp({
			withTimezone: true,
		}),
		deletedAtHash: text(),
		deletedAtBlock: bigint({ mode: "bigint" }),
		deletedAtBlockDatetime: timestamp({
			withTimezone: true,
		}),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true }).notNull(),
		deletedAt: timestamp({ withTimezone: true }),
		// - intentionally not a foreign key because we don't want to enforce that the writer exists
		//   so we are able to seed data in an async manner
		// - we reference the storage address of the writer as the entries exist on the writer's storage
		storageAddress: varchar({ length: 42 }).notNull(),
		createdAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => syndicateTx.id),
		deletedAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => syndicateTx.id),
		updatedAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => syndicateTx.id),
	},
	(entries) => ({
		onChainStorageAddressIndex: uniqueIndex(
			"on_chain_id_storage_address_idx",
		).on(entries.onChainId, entries.storageAddress),
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

export const syndicateTx = pgTable("syndicate_tx", {
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
