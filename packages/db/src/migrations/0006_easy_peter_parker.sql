-- Add the frozen `storage_id` column to the writer table.
--
-- For new writers, storage_id is set to storeAddress at insert time by the
-- indexer's WriterCreated handler. For existing rows we backfill it to equal
-- storage_address (the same identity at v1 of the system, before any chain
-- migrations existed). Once backfilled, treat the column as immutable.
--
-- This is a 3-step migration because PostgreSQL ADD COLUMN ... NOT NULL with
-- no default fails on tables with existing rows. We add the column as
-- nullable, backfill, then lock it to NOT NULL.
ALTER TABLE "writer" ADD COLUMN "storage_id" varchar(42);
--> statement-breakpoint
UPDATE "writer" SET "storage_id" = "storage_address" WHERE "storage_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "writer" ALTER COLUMN "storage_id" SET NOT NULL;
