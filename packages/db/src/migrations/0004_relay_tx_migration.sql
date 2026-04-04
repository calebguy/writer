-- Rename syndicate_tx table to relay_tx
ALTER TABLE "syndicate_tx" RENAME TO "relay_tx";

-- Add new columns
ALTER TABLE "relay_tx" ADD COLUMN "wallet" varchar(42);
ALTER TABLE "relay_tx" ADD COLUMN "nonce" integer;
ALTER TABLE "relay_tx" ADD COLUMN "error" text;

-- Update the enum: add new values, then migrate data, then remove old values
-- Add new values to the existing enum
ALTER TYPE "request_status" ADD VALUE IF NOT EXISTS 'ERROR';

-- Migrate old status values to new ones
UPDATE "relay_tx" SET "status" = 'SUBMITTED' WHERE "status" = 'PROCESSED';
UPDATE "relay_tx" SET "status" = 'ERROR' WHERE "status" = 'PAUSED';
UPDATE "relay_tx" SET "status" = 'ERROR' WHERE "status" = 'ABANDONED';

-- Rename foreign key constraints to reference new table name
ALTER TABLE "chunk" RENAME CONSTRAINT "chunk_created_at_transaction_id_syndicate_tx_id_fk" TO "chunk_created_at_transaction_id_relay_tx_id_fk";
ALTER TABLE "entry" RENAME CONSTRAINT "entry_created_at_transaction_id_syndicate_tx_id_fk" TO "entry_created_at_transaction_id_relay_tx_id_fk";
ALTER TABLE "entry" RENAME CONSTRAINT "entry_deleted_at_transaction_id_syndicate_tx_id_fk" TO "entry_deleted_at_transaction_id_relay_tx_id_fk";
ALTER TABLE "entry" RENAME CONSTRAINT "entry_updated_at_transaction_id_syndicate_tx_id_fk" TO "entry_updated_at_transaction_id_relay_tx_id_fk";
ALTER TABLE "writer" RENAME CONSTRAINT "writer_transaction_id_syndicate_tx_id_fk" TO "writer_transaction_id_relay_tx_id_fk";
