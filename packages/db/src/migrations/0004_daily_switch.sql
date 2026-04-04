ALTER TABLE "syndicate_tx" RENAME TO "relay_tx";--> statement-breakpoint
ALTER TABLE "chunk" DROP CONSTRAINT "chunk_created_at_transaction_id_syndicate_tx_id_fk";
--> statement-breakpoint
ALTER TABLE "entry" DROP CONSTRAINT "entry_created_at_transaction_id_syndicate_tx_id_fk";
--> statement-breakpoint
ALTER TABLE "entry" DROP CONSTRAINT "entry_deleted_at_transaction_id_syndicate_tx_id_fk";
--> statement-breakpoint
ALTER TABLE "entry" DROP CONSTRAINT "entry_updated_at_transaction_id_syndicate_tx_id_fk";
--> statement-breakpoint
ALTER TABLE "writer" DROP CONSTRAINT "writer_transaction_id_syndicate_tx_id_fk";
--> statement-breakpoint
ALTER TABLE "relay_tx" ADD COLUMN "wallet" varchar(42);--> statement-breakpoint
ALTER TABLE "relay_tx" ADD COLUMN "nonce" integer;--> statement-breakpoint
ALTER TABLE "relay_tx" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "chunk" ADD CONSTRAINT "chunk_created_at_transaction_id_relay_tx_id_fk" FOREIGN KEY ("created_at_transaction_id") REFERENCES "public"."relay_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_created_at_transaction_id_relay_tx_id_fk" FOREIGN KEY ("created_at_transaction_id") REFERENCES "public"."relay_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_deleted_at_transaction_id_relay_tx_id_fk" FOREIGN KEY ("deleted_at_transaction_id") REFERENCES "public"."relay_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_updated_at_transaction_id_relay_tx_id_fk" FOREIGN KEY ("updated_at_transaction_id") REFERENCES "public"."relay_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer" ADD CONSTRAINT "writer_transaction_id_relay_tx_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."relay_tx"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TYPE "public"."request_status" ADD VALUE IF NOT EXISTS 'ERROR';