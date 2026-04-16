import { entryToJsonSafe, publicWriterToJsonSafe, writerToJsonSafe } from "db";
import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { computeWriterAddress, computeWriterStorageAddress } from "utils";
import { type Hex, getAddress, toHex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	DELETE_ENTRY_FUNCTION_SIGNATURE,
	SET_HEX_FUNCTION_SIGNATURE,
	UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
	db,
} from "../constants";
import { env } from "../env";
import {
	type ReconcileEntryResult,
	type ReconcileWriterResult,
	humanizeSimulateError,
	reconcileEntryByDbId,
	reconcileWriterByAddress,
	recoverCreateWithChunkSigner,
	recoverRemoveEntrySigner,
	recoverSetColorSigner,
	recoverUpdateEntryWithChunkSigner,
	simulateContractOrThrow,
} from "../helpers";
import {
	addressAndIDParamSchema,
	addressParamSchema,
	colorRegistrySetJsonValidator,
	createWithChunkJsonValidator,
	deleteEntryJsonValidator,
	factoryCreateJsonValidator,
	updateEntryJsonValidator,
	userAddressParamSchema,
} from "../middleware";
import {
	requireSavedAuth,
	requireWalletAuth,
	requireWriterAdminAuth,
} from "../privy";
import { makeRelayTxId, relay } from "../relay";
import { watchRelayReceipt } from "../receipt-watcher";
import {
	applyOverlayToWritersForManager,
	getWriterWithOverlay,
} from "../pending-overlay";

const writerRoutes = new Hono()
	.get("/manager/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWritersByManager(address);
		const confirmed = data.map((w) => ({
			...writerToJsonSafe(w),
			entries: w.entries.map(entryToJsonSafe),
		}));
		// Overlay pending relay_tx rows so optimistic state shows up in
		// the writers list before the indexer confirms each tx. The
		// manager-scoped overlay also synthesizes rows for pending
		// factory creates where this user is listed as admin/manager, so
		// a freshly-created writer appears without a page refresh.
		const writers = await applyOverlayToWritersForManager(
			address,
			confirmed as Parameters<typeof applyOverlayToWritersForManager>[1],
		);
		return c.json({ writers });
	})
	.post(
		"/manager/:userAddress/reconcile",
		userAddressParamSchema,
		requireSavedAuth,
		async (c) => {
			const { userAddress } = c.req.valid("param");
			const writers = await db.getWritersByManager(userAddress);

			const writerResults: ReconcileWriterResult[] = [];
			const entryResults: ReconcileEntryResult[] = [];

			for (const w of writers) {
				// Only reconcile writers that aren't yet confirmed onchain.
				if (!w.createdAtHash) {
					writerResults.push(await reconcileWriterByAddress(w.address as Hex));
				}

				// Re-fetch in case the writer reconciliation above backfilled entries
				// via on-chain logs, so we don't redundantly reconcile them.
				const refreshed = await db.getWriter(w.address as Hex);
				if (!refreshed) continue;

				const pendingEntries = refreshed.entries.filter(
					(entry) =>
						!entry.deletedAt && (!entry.onChainId || !entry.createdAtHash),
				);
				for (const entry of pendingEntries) {
					entryResults.push(await reconcileEntryByDbId(entry.id));
				}
			}

			const summary = {
				writers: {
					total: writerResults.length,
					updated: writerResults.filter((r) => r.action === "updated" && r.ok)
						.length,
					noop: writerResults.filter((r) => r.action === "noop").length,
					skipped: writerResults.filter((r) => r.action === "skipped").length,
					failed: writerResults.filter((r) => r.action === "failed").length,
				},
				entries: {
					total: entryResults.length,
					updated: entryResults.filter((r) => r.action === "updated" && r.ok)
						.length,
					noop: entryResults.filter((r) => r.action === "noop").length,
					skipped: entryResults.filter((r) => r.action === "skipped").length,
					failed: entryResults.filter((r) => r.action === "failed").length,
				},
			};

			return c.json({
				summary,
				results: { writers: writerResults, entries: entryResults },
			});
		},
	)
	.get("/me/:address", addressParamSchema, async (c) => {
		const { address } = c.req.valid("param");
		const user = await db.getUser(address);
		return c.json({ user });
	})
	.get("/writer/public", async (c) => {
		const writers = await db.getPublicWriters();
		return c.json({ writers: writers.map(publicWriterToJsonSafe) });
	})
	.get("/writer/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		// Overlay serves the same shape as before when the writer already
		// exists in the DB, and synthesizes a pending-writer shape from
		// relay_tx.args when it doesn't (e.g. right after /factory/create,
		// before WriterCreated is indexed).
		const writer = await getWriterWithOverlay(address);
		if (!writer) {
			return c.json({ error: "writer not found" }, 404);
		}
		return c.json({ writer });
	})
	.post(
		"/color-registry/set",
		requireWalletAuth,
		colorRegistrySetJsonValidator,
		async (c) => {
			const { signature, nonce, hexColor } = c.req.valid("json");

			const address = await recoverSetColorSigner({
				signature: signature as Hex,
				nonce,
				hexColor: hexColor as Hex,
				address: env.COLOR_REGISTRY_ADDRESS as Hex,
			});

			// Audit fix for H-3: the EIP-712 signer must match the authenticated
			// wallet. Prevents an attacker from replaying a captured signature
			// against the relay (and prevents anonymous relay-drain entirely).
			if (getAddress(address) !== c.var.walletAddress) {
				return c.json(
					{ error: "signer does not match authenticated wallet" },
					403,
				);
			}

			const args = {
				signature,
				nonce: Number(nonce),
				hexColor,
			};
			try {
				const { wallet, nonce: relayNonce } = await relay.sendTransaction({
					to: env.COLOR_REGISTRY_ADDRESS,
					abi: SET_HEX_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), hexColor],
				});
				const transactionId = makeRelayTxId(wallet, relayNonce);
				await db.createTx({
					id: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: SET_HEX_FUNCTION_SIGNATURE,
					args,
					status: "PENDING",
				});
				watchRelayReceipt({
					txId: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: SET_HEX_FUNCTION_SIGNATURE,
					args,
				});
				const user = await db.upsertUser({
					address: address,
					color: hexColor,
				});
				return c.json({ user });
			} catch (err) {
				console.error("color-registry/set db error:", err);
				// Audit fix L-14: don't leak the underlying DB error message in
				// the response. Logs above retain the full error for debugging.
				return c.json({ error: "database error during color set" }, 500);
			}
		},
	)
	.post(
		"/factory/create",
		requireWalletAuth,
		factoryCreateJsonValidator,
		async (c) => {
			const { admin, managers, title } = c.req.valid("json");

			// Audit fix for H-2: the authenticated wallet must equal the `admin`
			// field on the new writer. This prevents anonymous relay-drain (you
			// must be logged in) AND prevents a confused-deputy attack where
			// someone creates a writer with another wallet as admin. Per-user
			// rate limiting is a separate follow-up.
			if (getAddress(admin) !== c.var.walletAddress) {
				return c.json({ error: "admin must equal authenticated wallet" }, 403);
			}

			const salt = toHex(randomBytes(32));
			// publicWritable is hardcoded to false here. The UI never creates
			// public writers — the launch public writer is deployed once via
			// the `script/CreatePublicWriter.s.sol` foundry script and picked
			// up by the indexer. If you ever want to surface public-writer
			// creation in the UI, add a `publicWritable` field to the zod
			// schema in middleware.ts and gate it with an admin check.
			const publicWritable = false;
			const args = { title, admin, managers, publicWritable, salt };
			const [address, storageAddress] = await Promise.all([
				computeWriterAddress({
					address: env.FACTORY_ADDRESS as Hex,
					salt,
					title,
					admin: getAddress(admin),
					managers: managers.map(getAddress),
					publicWritable,
				}),
				computeWriterStorageAddress({
					address: env.FACTORY_ADDRESS as Hex,
					salt,
				}),
			]);
			try {
				await simulateContractOrThrow({
					to: env.FACTORY_ADDRESS as Hex,
					functionSignature: CREATE_FUNCTION_SIGNATURE,
					args: [title, admin, managers, publicWritable, salt],
				});
			} catch (err) {
				console.error("Simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			try {
				const { wallet, nonce: relayNonce } = await relay.sendTransaction({
					to: env.FACTORY_ADDRESS,
					abi: CREATE_FUNCTION_SIGNATURE,
					args: [title, admin, managers, publicWritable, salt],
				});
				const transactionId = makeRelayTxId(wallet, relayNonce);
				await db.createTx({
					id: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: CREATE_FUNCTION_SIGNATURE,
					args,
					status: "PENDING",
					// Pending-overlay lookup key: the deterministic writer
					// address this tx creates. The overlay synthesizes the
					// writer row from these args until the indexer writes
					// the authoritative row on WriterCreated.
					targetAddress: address,
				});
				watchRelayReceipt({
					txId: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: CREATE_FUNCTION_SIGNATURE,
					args,
				});
				// The indexer is the sole writer of the `writer` table.
				// Return a synthesized pending-writer shape (same shape as
				// the overlay serves on reads) so existing FE callers can
				// keep using `onSuccess: ({ writer }) => ...` without
				// changes. Field shape must match writerToJsonSafe:
				// nullable-bigint columns are `string | undefined`,
				// nullable-text/timestamp columns are `string | null`/
				// `Date | null`.
				const now = new Date();
				const writer = {
					address,
					storageAddress,
					storageId: storageAddress,
					publicWritable,
					legacyDomain: false,
					title,
					admin,
					managers,
					createdAtHash: null,
					createdAtBlock: undefined,
					createdAtBlockDatetime: null,
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
					transactionId,
				};
				return c.json({ writer }, 201);
			} catch (err) {
				console.error("factory/create error:", err);
				return c.json({ error: "error during writer creation" }, 500);
			}
		},
	)
	.post(
		"/writer/:address/hide",
		addressParamSchema,
		requireWriterAdminAuth,
		async (c) => {
			const { address } = c.req.valid("param");
			const writer = await db.getWriter(address);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}
			try {
				await db.deleteWriter(address);
				return c.json(
					{
						writer: {
							...writerToJsonSafe(writer),
							entries: writer.entries.map(entryToJsonSafe),
						},
					},
					200,
				);
			} catch (err) {
				console.error("writer/hide db error:", err);
				return c.json({ error: "database error during writer hide" }, 500);
			}
		},
	)
	.post(
		"/writer/:address/entry/createWithChunk",
		requireWalletAuth,
		addressParamSchema,
		createWithChunkJsonValidator,
		async (c) => {
			const contractAddress = getAddress(c.req.valid("param").address);
			const writer = await db.getWriter(contractAddress);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}

			const { signature, nonce, chunkCount, chunkContent } =
				c.req.valid("json");

			const author = await recoverCreateWithChunkSigner({
				signature: signature as Hex,
				nonce,
				chunkContent,
				chunkCount,
				address: contractAddress,
				legacyDomain: writer.legacyDomain,
			});

			// Audit fix for H-3: the EIP-712 recovered signer (which becomes
			// the entry's author) must match the authenticated wallet. This
			// prevents an attacker from replaying someone else's captured
			// signature against the relay.
			if (getAddress(author) !== c.var.walletAddress) {
				return c.json(
					{ error: "signer does not match authenticated wallet" },
					403,
				);
			}

			const args = {
				signature,
				nonce: Number(nonce),
				chunkCount: Number(chunkCount),
				chunkContent,
			};
			try {
				await simulateContractOrThrow({
					to: contractAddress,
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(chunkCount), chunkContent],
				});
			} catch (err) {
				console.error("Simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			try {
				const { wallet, nonce: relayNonce } = await relay.sendTransaction({
					to: contractAddress,
					abi: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(chunkCount), chunkContent],
				});
				const transactionId = makeRelayTxId(wallet, relayNonce);
				await db.createTx({
					id: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args,
					status: "PENDING",
					targetAddress: contractAddress,
				});
				watchRelayReceipt({
					txId: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args,
				});
				// Indexer is the sole writer of `entry` / `chunk`. The
				// pending overlay surfaces this tx via `relay_tx` on reads
				// until EntryCreated fires. FE callers already update their
				// TanStack cache optimistically via onMutate, so a minimal
				// ack response is sufficient.
				return c.json({ pending: { transactionId, author } }, 202);
			} catch (err) {
				console.error("createWithChunk error:", err);
				return c.json({ error: "error during entry creation" }, 500);
			}
		},
	)
	.get("/writer/:address/entry/:id", addressAndIDParamSchema, async (c) => {
		const { address, id } = c.req.valid("param");
		// Use the overlay so pending updates / deletes show through on the
		// single-entry read path too.
		const writer = await getWriterWithOverlay(address);
		if (!writer) {
			return c.json({ error: "writer not found" }, 404);
		}
		const entry = writer.entries.find((e) => e.onChainId === String(id));
		if (!entry) {
			return c.json({ error: "entry not found" }, 404);
		}
		return c.json({ entry });
	})
	.post(
		"/writer/:address/entry/:id/update",
		requireWalletAuth,
		addressAndIDParamSchema,
		updateEntryJsonValidator,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const { signature, nonce, totalChunks, content } = c.req.valid("json");

			const contractAddress = getAddress(address);
			const writer = await db.getWriter(address);
			if (!writer) {
				console.log("writer not found");
				return c.json({ error: "writer not found" }, 404);
			}

			const entry = await db.getEntryByOnchainId(
				writer.storageAddress as Hex,
				id,
			);
			if (!entry) {
				console.log("entry not found");
				return c.json({ error: "entry not found" }, 404);
			}

			const author = await recoverUpdateEntryWithChunkSigner({
				signature: signature as Hex,
				nonce,
				totalChunks,
				content,
				entryId: id,
				address: contractAddress,
				legacyDomain: writer.legacyDomain,
			});
			// Audit fix for H-3: recovered signer must match the
			// authenticated wallet (so an attacker can't replay a captured
			// signature against the relay).
			if (getAddress(author) !== c.var.walletAddress) {
				return c.json(
					{ error: "signer does not match authenticated wallet" },
					403,
				);
			}
			if (entry.author.toLowerCase() !== author.toLowerCase()) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = {
				signature,
				nonce: Number(nonce),
				totalChunks: Number(totalChunks),
				content,
				id: Number(id),
			};
			try {
				await simulateContractOrThrow({
					to: contractAddress,
					functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
					args: [
						signature,
						Number(nonce),
						Number(id),
						Number(totalChunks),
						content,
					],
				});
			} catch (err) {
				console.error("Simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			const { wallet, nonce: relayNonce } = await relay.sendTransaction({
				to: contractAddress,
				abi: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args: [
					signature,
					Number(nonce),
					Number(id),
					Number(totalChunks),
					content,
				],
			});
			const transactionId = makeRelayTxId(wallet, relayNonce);
			await db.createTx({
				id: transactionId,
				wallet,
				nonce: relayNonce,
				chainId: BigInt(env.TARGET_CHAIN_ID),
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
				targetAddress: contractAddress,
			});
			watchRelayReceipt({
				txId: transactionId,
				wallet,
				nonce: relayNonce,
				chainId: BigInt(env.TARGET_CHAIN_ID),
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});

			// Indexer is the sole writer of `entry` / `chunk`. The pending
			// overlay patches in the new content on reads until EntryUpdated
			// fires. FE's onMutate already replaced the cache; this is an ack.
			return c.json({ pending: { transactionId } }, 202);
		},
	)
	.post(
		"/writer/:address/entry/:id/delete",
		requireWalletAuth,
		addressAndIDParamSchema,
		deleteEntryJsonValidator,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const { signature, nonce } = c.req.valid("json");
			const writer = await db.getWriter(address);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}

			const entry = await db.getEntryByOnchainId(
				writer.storageAddress as Hex,
				id,
			);
			if (!entry) {
				return c.json({ error: "entry not found" }, 404);
			}

			const signer = await recoverRemoveEntrySigner({
				signature: signature as Hex,
				nonce,
				id,
				address,
				legacyDomain: writer.legacyDomain,
			});
			// Audit fix for H-3: recovered signer must match the
			// authenticated wallet (so an attacker can't replay a captured
			// signature against the relay).
			if (getAddress(signer) !== c.var.walletAddress) {
				return c.json(
					{ error: "signer does not match authenticated wallet" },
					403,
				);
			}
			if (entry.author.toLowerCase() !== signer.toLowerCase()) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = { signature, nonce: Number(nonce), id: Number(id) };
			try {
				await simulateContractOrThrow({
					to: address as Hex,
					functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(id)],
				});
			} catch (err) {
				console.error("Simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			try {
				const { wallet, nonce: relayNonce } = await relay.sendTransaction({
					to: address,
					abi: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(id)],
				});
				const transactionId = makeRelayTxId(wallet, relayNonce);
				await db.createTx({
					id: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args,
					status: "PENDING",
					targetAddress: address,
				});
				watchRelayReceipt({
					txId: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args,
				});
				// Indexer is the sole writer of `entry`. The overlay marks
				// this entry as deletedAt on reads until EntryRemoved fires.
				return c.json({ pending: { transactionId } }, 202);
			} catch (err) {
				console.error("delete entry error:", err);
				return c.json({ error: "error during entry deletion" }, 500);
			}
		},
	);

export default writerRoutes;
