CREATE TABLE "ingestor_cursor" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"last_block" bigint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
