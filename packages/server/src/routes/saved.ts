import { savedEntryToJsonSafe, savedWriterToJsonSafe } from "db";
import { db } from "../constants";
import {
	userAddressAndAddressParamSchema,
	userAddressAndIDParamSchema,
	userAddressParamSchema,
} from "../middleware";
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
		userAddressAndAddressParamSchema,
		async (c) => {
			const { userAddress, address } = c.req.valid("param");
			const writer = await db.getWriter(address);
			if (!writer || writer.deletedAt) {
				return c.json({ error: "writer not found" }, 404);
			}
			await db.saveWriter(userAddress, address);
			return c.json({ ok: true }, 201);
		},
	)
	.delete(
		"/saved/:userAddress/writer/:address",
		userAddressAndAddressParamSchema,
		async (c) => {
			const { userAddress, address } = c.req.valid("param");
			await db.unsaveWriter(userAddress, address);
			return c.json({ ok: true }, 200);
		},
	)
	.post(
		"/saved/:userAddress/entry/:id",
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
			await db.saveEntry(userAddress, entryId);
			return c.json({ ok: true }, 201);
		},
	)
	.delete(
		"/saved/:userAddress/entry/:id",
		userAddressAndIDParamSchema,
		async (c) => {
			const { userAddress, id } = c.req.valid("param");
			const entryId = Number(id);
			if (!Number.isSafeInteger(entryId) || entryId <= 0) {
				return c.json({ error: "invalid entry id" }, 400);
			}
			await db.unsaveEntry(userAddress, entryId);
			return c.json({ ok: true }, 200);
		},
	);

export default savedRoutes;
