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
	reconcileEntryByDbId,
	reconcileWriterByAddress,
	recoverCreateWithChunkSigner,
	recoverRemoveEntrySigner,
	recoverSetColorSigner,
	recoverUpdateEntryWithChunkSigner,
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

const writerRoutes = new Hono()
	.get("/manager/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWritersByManager(address);
		const writers = data.map((w) => ({
			...writerToJsonSafe(w),
			entries: w.entries.map(entryToJsonSafe),
		}));
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
		const data = await db.getWriter(address);
		if (!data) {
			return c.json({ error: "writer not found" }, 404);
		}
		const writer = {
			...writerToJsonSafe(data),
			entries: data.entries.map(entryToJsonSafe),
		};
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
				});
				const data = await db.upsertWriter({
					title,
					admin,
					managers,
					publicWritable,
					transactionId,
					address,
					storageAddress,
				});
				const writer = writerToJsonSafe(data[0]);
				return c.json({ writer }, 201);
			} catch (err) {
				console.error("factory/create db error:", err);
				return c.json({ error: "database error during writer creation" }, 500);
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
				});
				const raw = chunkContent;
				const [data] = await db.upsertEntry({
					exists: true,
					storageAddress: writer.storageAddress,
					createdAtTransactionId: transactionId,
					author,
				});
				if (!data) {
					return c.json({ error: "entry not found" }, 404);
				}
				await db.upsertChunk({
					entryId: data.id,
					content: raw,
					createdAtTransactionId: transactionId,
					index: 0,
				});
				const entryRefreshed = await db.getEntry(
					writer.storageAddress as Hex,
					data.id,
				);
				if (!entryRefreshed) {
					return c.json({ error: "entry not found" }, 404);
				}
				const entry = entryToJsonSafe(entryRefreshed);
				return c.json({ entry }, 201);
			} catch (err) {
				console.error("createWithChunk db error:", err);
				return c.json({ error: "database error during entry creation" }, 500);
			}
		},
	)
	.get("/writer/:address/entry/:id", addressAndIDParamSchema, async (c) => {
		const { address, id } = c.req.valid("param");
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
		return c.json({ entry: entryToJsonSafe(entry) });
	})
	.get(
		"/writer/:address/entry/pending/:id",
		addressAndIDParamSchema,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const writer = await db.getWriter(address);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}
			const entry = await db.getEntry(writer.storageAddress as Hex, Number(id));
			if (!entry) {
				return c.json({ error: "entry not found" }, 404);
			}
			return c.json({ entry: entryToJsonSafe(entry) });
		},
	)
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
			});

			try {
				const [data] = await db.upsertEntry({
					createdAtTransactionId: entry.createdAtTransactionId,
					id: entry.id,
					exists: true,
					storageAddress: writer.storageAddress,
					author,
					updatedAtTransactionId: transactionId,
				});
				if (!data) {
					return c.json({ error: "entry not found after update" }, 404);
				}
				await db.upsertChunk({
					entryId: data.id,
					content: content,
					createdAtTransactionId: transactionId,
					index: 0,
				});
				return c.json({ entry: entryToJsonSafe(data) }, 201);
			} catch (err) {
				console.error("update entry db error:", err);
				return c.json({ error: "database error during entry update" }, 500);
			}
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
				});
				await db.deleteEntry(writer.storageAddress as Hex, id, transactionId);
				const newData = await db.getWriter(address);
				if (!newData) {
					return c.json({ error: "writer not found" }, 404);
				}
				return c.json({
					writer: {
						...writerToJsonSafe(newData),
						entries: newData.entries.map(entryToJsonSafe),
					},
				});
			} catch (err) {
				console.error("delete entry db error:", err);
				return c.json({ error: "database error during entry deletion" }, 500);
			}
		},
	);

export default writerRoutes;
