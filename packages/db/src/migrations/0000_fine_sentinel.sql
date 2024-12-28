CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'PROCESSED', 'SUBMITTED', 'CONFIRMED', 'PAUSED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"exists" boolean NOT NULL,
	"on_chain_id" bigint,
	"content" text,
	"created_at_hash" text,
	"created_at_block" bigint,
	"created_at_block_datetime" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"writer_id" integer NOT NULL,
	"transaction_id" varchar(255),
	CONSTRAINT "entry_transactionId_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "syndicate_transaction" (
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
CREATE TABLE "writer" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"address" varchar(42),
	"storage_address" varchar(42),
	"admin" text NOT NULL,
	"managers" text[] NOT NULL,
	"on_chain_id" bigint,
	"created_at_hash" text,
	"created_at_block" bigint,
	"created_at_block_datetime" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"transaction_id" varchar(255),
	CONSTRAINT "writer_address_unique" UNIQUE("address"),
	CONSTRAINT "writer_storageAddress_unique" UNIQUE("storage_address"),
	CONSTRAINT "writer_onChainId_unique" UNIQUE("on_chain_id"),
	CONSTRAINT "writer_transactionId_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_writer_id_writer_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."writer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_transaction_id_syndicate_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."syndicate_transaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer" ADD CONSTRAINT "writer_transaction_id_syndicate_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."syndicate_transaction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_on_chain_writer_idx" ON "entry" USING btree ("on_chain_id","writer_id");