import { savedEntryToJsonSafe, savedWriterToJsonSafe } from "db";
import { db } from "../constants";
import {
	userAddressAndAddressParamSchema,
	userAddressAndIDParamSchema,
	userAddressParamSchema,
} from "../middleware";
import { requireSavedAuth } from "../privy";
import { Hono } from "hono";

const savedRoutes = new Hono()
	.get("/saved/:userAddress", userAddressParamSchema, async (c) => {
		const { userAddress } = c.req.valid("param");
		const data = await db.getSaved(userAddress);
		return c.json({
			writers: data.writers.map(savedWriterToJsonSafe),
			entries: data.entries.map(savedEntryToJsonSafe),
		});
	})
	.post(
		"/saved/:userAddress/writer/:address",
		requireSavedAuth,
		userAddressAndAddressParamSchema,
		async (c) => {
			const { userAddress, address } = c.req.valid("param");
			const writer = await db.getWriter(address);
			if (!writer || writer.deletedAt) {
				return c.json({ error: "writer not found" }, 404);
			}
			try {
				await db.saveWriter(userAddress, address);
				return c.json({ ok: true }, 201);
			} catch (err) {
				console.error("save writer db error:", err);
				// Audit fix L-14: don't leak the underlying DB error message
				// in the response. Logs above retain the full error for debugging.
				return c.json({ error: "database error during save writer" }, 500);
			}
		},
	)
	.delete(
		"/saved/:userAddress/writer/:address",
		requireSavedAuth,
		userAddressAndAddressParamSchema,
		async (c) => {
			const { userAddress, address } = c.req.valid("param");
			try {
				await db.unsaveWriter(userAddress, address);
				return c.json({ ok: true }, 200);
			} catch (err) {
				console.error("unsave writer db error:", err);
				return c.json({ error: "database error during unsave writer" }, 500);
			}
		},
	)
	.post(
		"/saved/:userAddress/entry/:id",
		requireSavedAuth,
		userAddressAndIDParamSchema,
		async (c) => {
			const { userAddress, id } = c.req.valid("param");
			const entryId = Number(id);
			if (!Number.isSafeInteger(entryId) || entryId <= 0) {
				return c.json({ error: "invalid entry id" }, 400);
			}
			const data = await db.getEntryById(entryId);
			if (!data || data.deletedAt) {
				return c.json({ error: "entry not found" }, 404);
			}
			try {
				await db.saveEntry(userAddress, entryId);
				return c.json({ ok: true }, 201);
			} catch (err) {
				console.error("save entry db error:", err);
				return c.json({ error: "database error during save entry" }, 500);
			}
		},
	)
	.delete(
		"/saved/:userAddress/entry/:id",
		requireSavedAuth,
		userAddressAndIDParamSchema,
		async (c) => {
			const { userAddress, id } = c.req.valid("param");
			const entryId = Number(id);
			if (!Number.isSafeInteger(entryId) || entryId <= 0) {
				return c.json({ error: "invalid entry id" }, 400);
			}
			try {
				await db.unsaveEntry(userAddress, entryId);
				return c.json({ ok: true }, 200);
			} catch (err) {
				console.error("unsave entry db error:", err);
				return c.json({ error: "database error during unsave entry" }, 500);
			}
		},
	);

export default savedRoutes;
