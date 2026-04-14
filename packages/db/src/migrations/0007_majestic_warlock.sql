-- Denormalized copy of writer.storage_id onto every entry. Avoids the need
-- to fetch / prop-drill the writer at every v4 decryption site. Safe to
-- denormalize because storage_id is frozen — once set, it can never change,
-- so there is no risk of the entry copy diverging from the writer copy.
--
-- Same 3-step pattern as 0006: ADD nullable, backfill, lock NOT NULL.
-- Backfill from the entry's existing storage_address (which equals
-- storage_id at v1, before any cross-chain migrations exist).
ALTER TABLE "entry" ADD COLUMN "storage_id" varchar(42);
--> statement-breakpoint
UPDATE "entry" SET "storage_id" = "storage_address" WHERE "storage_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "entry" ALTER COLUMN "storage_id" SET NOT NULL;
