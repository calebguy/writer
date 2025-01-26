CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'PROCESSED', 'SUBMITTED', 'CONFIRMED', 'PAUSED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"exists" boolean NOT NULL,
	"on_chain_id" bigint,
	"version" text,
	"raw" text,
	"decompressed" text,
	"author" text NOT NULL,
	"created_at_hash" text,
	"created_at_block" bigint,
	"created_at_block_datetime" timestamp with time zone,
	"deleted_at_hash" text,
	"deleted_at_block" bigint,
	"deleted_at_block_datetime" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"storage_address" varchar(42) NOT NULL,
	"created_at_transaction_id" varchar(255),
	"deleted_at_transaction_id" varchar(255),
	"updated_at_transaction_id" varchar(255),
	CONSTRAINT "entry_createdAtTransactionId_unique" UNIQUE("created_at_transaction_id"),
	CONSTRAINT "entry_deletedAtTransactionId_unique" UNIQUE("deleted_at_transaction_id"),
	CONSTRAINT "entry_updatedAtTransactionId_unique" UNIQUE("updated_at_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "syndicate_tx" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"chain_id" bigint NOT NULL,
	"block_number" bigint,
	"hash" text,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"function_signature" text NOT NULL,
	"args" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writer" (
	"address" varchar(42) PRIMARY KEY NOT NULL,
	"storage_address" varchar(42) NOT NULL,
	"title" text NOT NULL,
	"admin" text NOT NULL,
	"managers" text[] NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at_hash" text,
	"created_at_block" bigint,
	"created_at_block_datetime" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"transaction_id" varchar(255),
	CONSTRAINT "writer_storageAddress_unique" UNIQUE("storage_address"),
	CONSTRAINT "writer_transactionId_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_created_at_transaction_id_syndicate_tx_id_fk" FOREIGN KEY ("created_at_transaction_id") REFERENCES "public"."syndicate_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_deleted_at_transaction_id_syndicate_tx_id_fk" FOREIGN KEY ("deleted_at_transaction_id") REFERENCES "public"."syndicate_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_updated_at_transaction_id_syndicate_tx_id_fk" FOREIGN KEY ("updated_at_transaction_id") REFERENCES "public"."syndicate_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer" ADD CONSTRAINT "writer_transaction_id_syndicate_tx_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."syndicate_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "storage_address_on_chain_id_idx" ON "entry" USING btree ("storage_address","on_chain_id");--> statement-breakpoint
CREATE INDEX "storage_address_idx" ON "entry" USING btree ("storage_address");