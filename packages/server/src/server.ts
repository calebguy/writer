import { entryToJsonSafe, writerToJsonSafe } from "db";
import { Hono } from "hono";
import { cors } from "hono/cors";
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
} from "./constants";
import { env } from "./env";
import {
	recoverCreateWithChunkSigner,
	recoverRemoveEntrySigner,
	recoverSetColorSigner,
	recoverUpdateEntryWithChunkSigner,
} from "./helpers";
import {
	addressAndIDParamSchema,
	addressParamSchema,
	colorRegistrySetJsonValidator,
	createWithChunkJsonValidator,
	deleteEntryJsonValidator,
	factoryCreateJsonValidator,
	updateEntryJsonValidator,
} from "./middleware";
import { syndicate } from "./syndicate";

const app = new Hono();

app.use("*", cors());

const api = app
	.basePath("/")
	.get("/manager/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWritersByManager(address);
		const writers = data.map((w) => ({
			...writerToJsonSafe(w),
			entries: w.entries.map(entryToJsonSafe),
		}));
		return c.json({ writers });
	})
	.get("/me/:address", async (c) => {
		const address = c.req.param("address");
		const user = await db.getUser(address as Hex);
		return c.json({ user });
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
	.post("/color-registry/set", colorRegistrySetJsonValidator, async (c) => {
		const { signature, nonce, hexColor } = c.req.valid("json");

		const address = await recoverSetColorSigner({
			signature: signature as Hex,
			nonce,
			hexColor: hexColor as Hex,
			address: env.COLOR_REGISTRY_ADDRESS as Hex,
		});

		const args = {
			signature,
			nonce: Number(nonce),
			hexColor,
		};
		const { transactionId } = await syndicate.transact.sendTransaction({
			projectId: env.SYNDICATE_PROJECT_ID,
			contractAddress: env.COLOR_REGISTRY_ADDRESS,
			chainId: env.TARGET_CHAIN_ID,
			functionSignature: SET_HEX_FUNCTION_SIGNATURE,
			args,
		});
		await db.createTx({
			id: transactionId,
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
	})
	.post("/factory/create", factoryCreateJsonValidator, async (c) => {
		const { admin, managers, title, isPrivate } = c.req.valid("json");
		const salt = toHex(randomBytes(32));
		const args = { title, admin, managers, salt };
		const [address, storageAddress] = await Promise.all([
			computeWriterAddress({
				address: env.FACTORY_ADDRESS as Hex,
				salt,
				title,
				admin: getAddress(admin),
				managers: managers.map(getAddress),
			}),
			computeWriterStorageAddress({
				address: env.FACTORY_ADDRESS as Hex,
				salt,
			}),
		]);
		const { transactionId } = await syndicate.transact.sendTransaction({
			projectId: env.SYNDICATE_PROJECT_ID,
			contractAddress: env.FACTORY_ADDRESS,
			chainId: env.TARGET_CHAIN_ID,
			functionSignature: CREATE_FUNCTION_SIGNATURE,
			args,
		});
		await db.createTx({
			id: transactionId,
			chainId: BigInt(env.TARGET_CHAIN_ID),
			functionSignature: CREATE_FUNCTION_SIGNATURE,
			args,
			status: "PENDING",
		});
		const data = await db.upsertWriter({
			title,
			admin,
			managers,
			transactionId,
			address,
			storageAddress,
			isPrivate,
		});
		const writer = writerToJsonSafe(data[0]);
		return c.json({ writer }, 201);
	})
	.delete("/writer/:address", addressParamSchema, async (c) => {
		const { address } = c.req.valid("param");
		const writer = await db.getWriter(address);
		if (!writer) {
			return c.json({ error: "writer not found" }, 404);
		}
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
	})
	.post(
		"/writer/:address/entry/createWithChunk",
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

			const args = {
				signature,
				nonce: Number(nonce),
				chunkCount: Number(chunkCount),
				chunkContent,
			};
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress,
				chainId: env.TARGET_CHAIN_ID,
				functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
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
	.post(
		"/writer/:address/entry/:id/update",
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
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress,
				chainId: env.TARGET_CHAIN_ID,
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(env.TARGET_CHAIN_ID),
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
			});

			const [data] = await db.upsertEntry({
				createdAtTransactionId: entry.createdAtTransactionId,
				id: entry.id,
				exists: true,
				storageAddress: writer.storageAddress,
				author,
				updatedAtTransactionId: transactionId,
			});
			if (!data) {
				return c.json({ error: "entry not found" }, 404);
			}
			await db.upsertChunk({
				entryId: data.id,
				content: content,
				createdAtTransactionId: transactionId,
				index: 0,
			});
			if (!data) {
				return c.json({ error: "entry not found" }, 404);
			}
			return c.json({ entry: entryToJsonSafe(data) }, 201);
		},
	)
	.post(
		"/writer/:address/entry/:id/delete",
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
			if (entry.author.toLowerCase() !== signer.toLowerCase()) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = { signature, nonce: Number(nonce), id: Number(id) };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress: address,
				chainId: env.TARGET_CHAIN_ID,
				functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
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
		},
	);

export type Api = typeof api;
export default app;
