import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema.ts",
	out: "./src/migrations",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
	casing: "snake_case",
});
