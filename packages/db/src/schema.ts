import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
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
	isPrivate: boolean().notNull().default(false),
	createdAtHash: text(),
	createdAtBlock: bigint({ mode: "bigint" }),
	createdAtBlockDatetime: timestamp({
		withTimezone: true,
	}),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
	deletedAt: timestamp({ withTimezone: true }),
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
		updatedAtHash: text(),
		updatedAtBlock: bigint({ mode: "bigint" }),
		updatedAtBlockDatetime: timestamp({
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
			"storage_address_on_chain_id_idx",
		).on(entries.storageAddress, entries.onChainId),
		storageAddressIndex: index("storage_address_idx").on(
			entries.storageAddress,
		),
	}),
);

export const chunk = pgTable(
	"chunk",
	{
		id: serial().primaryKey(),
		entryId: integer().notNull(),
		index: integer().notNull(),
		content: text().notNull(),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		createdAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => syndicateTx.id),
	},
	(chunks) => ({
		entryIdIndex: uniqueIndex("entry_index_idx").on(
			chunks.entryId,
			chunks.index,
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

export const user = pgTable("user", {
	address: varchar({ length: 42 }).primaryKey(),
	color: text(),
	createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ withTimezone: true }).notNull(),
});

export const savedWriter = pgTable(
	"saved_writer",
	{
		userAddress: varchar({ length: 42 }).notNull(),
		writerAddress: varchar({ length: 42 })
			.notNull()
			.references(() => writer.address),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userAddress, table.writerAddress] }),
		userAddressIndex: index("saved_writer_user_address_idx").on(
			table.userAddress,
		),
	}),
);

export const savedEntry = pgTable(
	"saved_entry",
	{
		userAddress: varchar({ length: 42 }).notNull(),
		entryId: integer()
			.notNull()
			.references(() => entry.id),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userAddress, table.entryId] }),
		userAddressIndex: index("saved_entry_user_address_idx").on(
			table.userAddress,
		),
	}),
);
