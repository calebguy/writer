ALTER TABLE "saved_writer" DROP CONSTRAINT "saved_writer_writer_address_writer_address_fk";
--> statement-breakpoint
ALTER TABLE "saved_writer" ADD CONSTRAINT "saved_writer_writer_address_writer_address_fk" FOREIGN KEY ("writer_address") REFERENCES "public"."writer"("address") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
