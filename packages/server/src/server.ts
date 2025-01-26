import { entryToJsonSafe, writerToJsonSafe } from "db";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { randomBytes } from "node:crypto";
import {
	computeWriterAddress,
	computeWriterStorageAddress,
	processRawContent,
} from "utils";
import { type Hex, getAddress, toHex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	DELETE_ENTRY_FUNCTION_SIGNATURE,
	SET_HEX_FUNCTION_SIGNATURE,
	TARGET_CHAIN_ID,
	UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
	db,
} from "./constants";
import { env } from "./env";
import {
	privyAuthMiddleware,
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

app.use("*", serveStatic({ root: "../ui/dist" }));
app.use("*", serveStatic({ path: "../ui/dist/index.html" }));

const api = app
	.basePath("/api")
	.get("/manager/:address", async (c) => {
		const address = getAddress(c.req.param("address"));
		const data = await db.getWritersByManager(address);
		const writers = data.map((w) => ({
			...writerToJsonSafe(w),
			entries: w.entries.map(entryToJsonSafe),
		}));
		return c.json({ writers });
	})
	.get("/me", privyAuthMiddleware, async (c) => {
		const privyUserAddress = c.get("privyUserAddress");
		const user = await db.getUser(privyUserAddress);
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
			nonce: Number(nonce),
			hexColor: hexColor as Hex,
			address: env.COLOR_REGISTRY_ADDRESS as Hex,
		});
		console.log("set color signer", address);

		const args = {
			signature,
			nonce: Number(nonce),
			hexColor,
		};
		const { transactionId } = await syndicate.transact.sendTransaction({
			projectId: env.SYNDICATE_PROJECT_ID,
			contractAddress: env.COLOR_REGISTRY_ADDRESS,
			chainId: TARGET_CHAIN_ID,
			functionSignature: SET_HEX_FUNCTION_SIGNATURE,
			args,
		});
		await db.createTx({
			id: transactionId,
			chainId: BigInt(TARGET_CHAIN_ID),
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
			chainId: TARGET_CHAIN_ID,
			functionSignature: CREATE_FUNCTION_SIGNATURE,
			args,
		});
		await db.createTx({
			id: transactionId,
			chainId: BigInt(TARGET_CHAIN_ID),
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
	.post(
		"/writer/:address/createWithChunk",
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

			console.log("createwithchunk author", author);

			const args = { signature, nonce, chunkCount, chunkContent };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress,
				chainId: TARGET_CHAIN_ID,
				functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(TARGET_CHAIN_ID),
				functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
			});
			const raw = chunkContent;
			const { version, decompressed } = processRawContent(raw);
			const data = await db.upsertEntry({
				exists: true,
				storageAddress: writer.storageAddress,
				createdAtTransactionId: transactionId,
				raw,
				decompressed,
				version,
				author,
			});
			const entry = entryToJsonSafe(data[0]);
			return c.json({ entry }, 201);
		},
	)
	.post(
		"/writer/:address/entry/:id/update",
		addressAndIDParamSchema,
		updateEntryJsonValidator,
		privyAuthMiddleware,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const { signature, nonce, totalChunks, content } = c.req.valid("json");

			const contractAddress = getAddress(address);
			const writer = await db.getWriter(address);
			if (!writer) {
				return c.json({ error: "writer not found" }, 404);
			}

			const entry = await db.getEntry(contractAddress, id);
			if (!entry) {
				return c.json({ error: "entry not found" }, 404);
			}

			const author = await recoverUpdateEntryWithChunkSigner({
				signature: signature as Hex,
				nonce,
				totalChunks,
				content,
				entryId: Number(id),
				address: contractAddress,
			});
			console.log("update author", author);
			if (entry.author !== author) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = { signature, nonce, totalChunks, content, id: Number(id) };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress,
				chainId: TARGET_CHAIN_ID,
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(TARGET_CHAIN_ID),
				functionSignature: UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
				args,
				status: "PENDING",
			});

			const raw = content;
			const { version, decompressed } = processRawContent(raw);

			const data = await db.upsertEntry({
				id: entry.id,
				exists: true,
				storageAddress: writer.storageAddress,
				createdAtTransactionId: transactionId,
				raw,
				decompressed,
				version,
				author,
				updatedAtTransactionId: transactionId,
			});
			return c.json({ entry: entryToJsonSafe(data[0]) }, 201);
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

			const entry = await db.getEntry(writer.storageAddress as Hex, id);
			if (!entry) {
				return c.json({ error: "entry not found" }, 404);
			}

			const signer = await recoverRemoveEntrySigner({
				signature: signature as Hex,
				nonce: Number(nonce),
				id: Number(id),
				address,
			});
			console.log("remove signer", signer);
			if (entry.author !== signer) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = { signature, nonce: Number(nonce), id: Number(id) };
			const { transactionId } = await syndicate.transact.sendTransaction({
				projectId: env.SYNDICATE_PROJECT_ID,
				contractAddress: address,
				chainId: TARGET_CHAIN_ID,
				functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
				args,
			});
			await db.createTx({
				id: transactionId,
				chainId: BigInt(TARGET_CHAIN_ID),
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
