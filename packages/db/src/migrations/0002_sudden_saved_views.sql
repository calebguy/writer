CREATE TABLE "saved_writer" (
	"user_address" varchar(42) NOT NULL,
	"writer_address" varchar(42) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_writer_user_address_writer_address_pk" PRIMARY KEY("user_address","writer_address")
);
--> statement-breakpoint
CREATE TABLE "saved_entry" (
	"user_address" varchar(42) NOT NULL,
	"entry_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_entry_user_address_entry_id_pk" PRIMARY KEY("user_address","entry_id")
);
--> statement-breakpoint
ALTER TABLE "saved_writer" ADD CONSTRAINT "saved_writer_writer_address_writer_address_fk" FOREIGN KEY ("writer_address") REFERENCES "public"."writer"("address") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_entry" ADD CONSTRAINT "saved_entry_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "saved_writer_user_address_idx" ON "saved_writer" USING btree ("user_address");
--> statement-breakpoint
CREATE INDEX "saved_entry_user_address_idx" ON "saved_entry" USING btree ("user_address");
