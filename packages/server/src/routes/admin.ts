import { db } from "../constants";
import {
	type ReconcileEntryResult,
	type ReconcileWriterResult,
	reconcileEntryByDbId,
	reconcileWriterByAddress,
} from "../helpers";
import { addressParamSchema, assertAdminKey, entryIDParamSchema } from "../middleware";
import { Hono } from "hono";

const adminRoutes = new Hono()
	.post("/admin/reconcile/entry/:entryId", entryIDParamSchema, async (c) => {
		const auth = assertAdminKey(c);
		if (!auth.ok) {
			return c.json(auth.body, auth.status);
		}

		const { entryId } = c.req.valid("param");
		const normalizedEntryId = Number(entryId);
		if (!Number.isSafeInteger(normalizedEntryId) || normalizedEntryId <= 0) {
			return c.json({ error: "invalid entry id" }, 400);
		}

		const result = await reconcileEntryByDbId(normalizedEntryId);
		const status = result.ok ? 200 : result.action === "failed" ? 500 : 200;
		return c.json({ result }, status);
	})
	.post("/admin/reconcile/writer/:address", addressParamSchema, async (c) => {
		const auth = assertAdminKey(c);
		if (!auth.ok) {
			return c.json(auth.body, auth.status);
		}

		const { address } = c.req.valid("param");
		const writer = await db.getWriter(address);
		if (!writer || writer.deletedAt) {
			return c.json({ error: "writer not found" }, 404);
		}

		const writerResult = await reconcileWriterByAddress(
			writer.address as `0x${string}`,
		);
		const pendingEntries = writer.entries.filter(
			(entry) => !entry.deletedAt && (!entry.onChainId || !entry.createdAtHash),
		);
		const results: ReconcileEntryResult[] = [];
		for (const entry of pendingEntries) {
			results.push(await reconcileEntryByDbId(entry.id));
		}

		const summary = {
			total: results.length,
			updated: results.filter((r) => r.action === "updated" && r.ok).length,
			noop: results.filter((r) => r.action === "noop").length,
			skipped: results.filter((r) => r.action === "skipped").length,
			failed: results.filter((r) => r.action === "failed").length,
		};

		return c.json(
			{
				writerAddress: writer.address,
				storageAddress: writer.storageAddress,
				writerResult,
				summary,
				results,
			},
			200,
		);
	})
	.post("/admin/reconcile/pending", async (c) => {
		const auth = assertAdminKey(c);
		if (!auth.ok) {
			return c.json(auth.body, auth.status);
		}

		const limitRaw = c.req.query("limit");
		const minAgeMinutesRaw = c.req.query("minAgeMinutes");
		const writerLimitRaw = c.req.query("writerLimit");
		const writerMinAgeMinutesRaw = c.req.query("writerMinAgeMinutes");
		const limit = Math.min(
			Math.max(Number.parseInt(limitRaw ?? "100", 10) || 100, 1),
			500,
		);
		const parsedMinAge = Number.parseInt(minAgeMinutesRaw ?? "3", 10);
		const minAgeMinutes = Math.min(
			Math.max(Number.isNaN(parsedMinAge) ? 3 : parsedMinAge, 0),
			24 * 60,
		);
		const olderThan =
			minAgeMinutes > 0
				? new Date(Date.now() - minAgeMinutes * 60 * 1000)
				: undefined;
		const writerLimit = Math.min(
			Math.max(Number.parseInt(writerLimitRaw ?? "50", 10) || 50, 1),
			500,
		);
		const writerMinAgeMinutes = Math.min(
			Math.max(Number.parseInt(writerMinAgeMinutesRaw ?? "10", 10) || 10, 0),
			24 * 60,
		);
		const writerOlderThan =
			writerMinAgeMinutes > 0
				? new Date(Date.now() - writerMinAgeMinutes * 60 * 1000)
				: undefined;

		const pendingEntries = await db.getPendingEntries({
			limit,
			olderThan,
		});
		const pendingWriters = await db.getPendingWriters({
			limit: writerLimit,
			olderThan: writerOlderThan,
		});
		const results: ReconcileEntryResult[] = [];
		for (const entry of pendingEntries) {
			results.push(await reconcileEntryByDbId(entry.id));
		}
		const writerResults: ReconcileWriterResult[] = [];
		for (const writer of pendingWriters) {
			writerResults.push(
				await reconcileWriterByAddress(writer.address as `0x${string}`),
			);
		}

		const summary = {
			entries: {
				requestedLimit: limit,
				minAgeMinutes,
				candidates: pendingEntries.length,
				updated: results.filter((r) => r.action === "updated" && r.ok).length,
				noop: results.filter((r) => r.action === "noop").length,
				skipped: results.filter((r) => r.action === "skipped").length,
				failed: results.filter((r) => r.action === "failed").length,
			},
			writers: {
				requestedLimit: writerLimit,
				minAgeMinutes: writerMinAgeMinutes,
				candidates: pendingWriters.length,
				updated: writerResults.filter((r) => r.action === "updated" && r.ok)
					.length,
				noop: writerResults.filter((r) => r.action === "noop").length,
				skipped: writerResults.filter((r) => r.action === "skipped").length,
				failed: writerResults.filter((r) => r.action === "failed").length,
			},
		};

		return c.json(
			{
				summary,
				results: {
					entries: results,
					writers: writerResults,
				},
			},
			200,
		);
	});

export default adminRoutes;
