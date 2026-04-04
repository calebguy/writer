UPDATE "relay_tx" SET "status" = 'SUBMITTED' WHERE "status" = 'PROCESSED';--> statement-breakpoint
UPDATE "relay_tx" SET "status" = 'ERROR' WHERE "status" IN ('PAUSED', 'ABANDONED');