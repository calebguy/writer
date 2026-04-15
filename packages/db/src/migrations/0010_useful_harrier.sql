ALTER TABLE "relay_tx" ADD COLUMN "target_address" varchar(42);--> statement-breakpoint
CREATE INDEX "relay_tx_target_address_idx" ON "relay_tx" USING btree ("target_address");