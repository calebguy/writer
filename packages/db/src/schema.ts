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
	// Frozen, durable identifier for this writer. Set at creation time and
	// never changed. For new writers this equals storageAddress; for legacy
	// writers it is backfilled to equal storageAddress. The encryption key
	// derivation (v4) binds to this value, so a writer that gets migrated to
	// a different chain (or even just a different storage contract) keeps the
	// same encryption key as long as `storage_id` is preserved across the
	// migration. Treat this column as immutable: never UPDATE it after insert.
	storageId: varchar({ length: 42 }).notNull(),
	// If true, this writer is a public message board: anyone can author
	// entries, only the original author can edit/remove their own.
	// Set at writer creation, frozen on chain (Writer.publicWritable is
	// `immutable`), and never updated after insert here.
	publicWritable: boolean().notNull().default(false),
	// Whether this writer's on-chain EIP-712 domain includes `chainId`.
	// True for writers created by the old factory (pre-redeploy). False
	// for writers created by the new factory (chain-portable domain).
	// Flipped to false when the writer's logic is migrated via
	// `WriterStorage.setLogic` (the indexer's LogicSet handler does this).
	// The frontend reads this to decide whether to include chainId when
	// signing write operations. Defaults to true so legacy writers work
	// out of the box without any user action.
	legacyDomain: boolean().notNull().default(true),
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
	deletedAt: timestamp({ withTimezone: true }),
	transactionId: varchar({ length: 255 })
		.unique()
		.references(() => relayTx.id),
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
		// Denormalized copy of writer.storage_id at the time the entry was
		// created. Frozen for the life of the entry. This avoids a join +
		// prop-drilling at every v4 decryption site: each entry already
		// knows which encryption key identity it belongs to. Safe to
		// denormalize because storage_id is itself frozen on the writer
		// table — the two values can never get out of sync.
		storageId: varchar({ length: 42 }).notNull(),
		createdAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => relayTx.id),
		deletedAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => relayTx.id),
		updatedAtTransactionId: varchar({ length: 255 })
			.unique()
			.references(() => relayTx.id),
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
			.references(() => relayTx.id),
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

export const relayTx = pgTable(
	"relay_tx",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		wallet: varchar({ length: 42 }),
		nonce: integer(),
		chainId: bigint({ mode: "bigint" }).notNull(),
		blockNumber: bigint({ mode: "bigint" }),
		hash: text(),
		status: requestStatus().default("PENDING").notNull(),
		functionSignature: text().notNull(),
		args: jsonb().notNull(),
		// Address of the writer this tx targets: the writer contract for
		// entry routes, or the deterministically-computed writer address
		// for factory creates. Lets us look up pending txs by writer with
		// a simple indexed lookup instead of JSONB gymnastics across
		// heterogeneous `args` shapes. Nullable to allow txs (e.g.
		// color-registry) that don't target a writer.
		targetAddress: varchar({ length: 42 }),
		error: text(),
		createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ withTimezone: true }).notNull(),
	},
	(tx) => ({
		targetAddressIndex: index("relay_tx_target_address_idx").on(
			tx.targetAddress,
		),
	}),
);

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
			.references(() => writer.address, { onUpdate: "cascade" }),
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
