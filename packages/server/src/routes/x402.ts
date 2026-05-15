import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { computeWriterAddress, computeWriterStorageAddress } from "utils";
import { type Hex, getAddress, toHex } from "viem";
import {
	CREATE_FUNCTION_SIGNATURE,
	CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
	DELETE_ENTRY_FUNCTION_SIGNATURE,
	UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE,
	db,
} from "../constants";
import { env } from "../env";
import {
	humanizeSimulateError,
	recoverCreateWithChunkSigner,
	recoverRemoveEntrySigner,
	recoverUpdateEntryWithChunkSigner,
	simulateContractOrThrow,
} from "../helpers";
import {
	addressAndIDParamSchema,
	addressParamSchema,
	createWithChunkJsonValidator,
	deleteEntryJsonValidator,
	updateEntryJsonValidator,
	x402FactoryCreateJsonValidator,
} from "../middleware";
import { makeRelayTxId, relay } from "../relay";
import { watchRelayReceipt } from "../receipt-watcher";
import { getX402Capabilities, getX402Payer, x402PaymentMiddleware } from "../x402";

const x402Routes = new Hono()
	.get("/x402/capabilities", (c) =>
		c.json(getX402Capabilities(), 200, {
			"cache-control": "public, max-age=300, stale-while-revalidate=3600",
		}),
	)
	.use("/x402/*", x402PaymentMiddleware())
	.post("/x402/factory/create", x402FactoryCreateJsonValidator, async (c) => {
		const { address: admin, title } = c.req.valid("json");
		const payer = getX402Payer(c);
		if (!payer || getAddress(admin) !== getAddress(payer)) {
			return c.json({ error: "admin must equal x402 payer" }, 403);
		}

		const managers = [admin];
		const salt = toHex(randomBytes(32));
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
			console.error("x402 factory/create simulation failed:", err);
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
				source: "x402",
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
			console.error("x402 factory/create error:", err);
			return c.json({ error: "error during writer creation" }, 500);
		}
	})
	.post(
		"/x402/writer/:address/entry/createWithChunk",
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

			const payer = getX402Payer(c);
			if (!payer || getAddress(author) !== getAddress(payer)) {
				return c.json({ error: "signer must equal x402 payer" }, 403);
			}

			const args = {
				signature,
				nonce: Number(nonce),
				chunkCount: Number(chunkCount),
				chunkContent,
				author,
			};
			try {
				await simulateContractOrThrow({
					to: contractAddress,
					functionSignature: CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(chunkCount), chunkContent],
				});
			} catch (err) {
				console.error("x402 createWithChunk simulation failed:", err);
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
					source: "x402",
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
				return c.json({ pending: { transactionId, author } }, 202);
			} catch (err) {
				console.error("x402 createWithChunk error:", err);
				return c.json({ error: "error during entry creation" }, 500);
			}
		},
	)
	.post(
		"/x402/writer/:address/entry/:id/update",
		addressAndIDParamSchema,
		updateEntryJsonValidator,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const contractAddress = getAddress(address);
			const { signature, nonce, totalChunks, content } = c.req.valid("json");

			const writer = await db.getWriter(contractAddress);
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

			const author = await recoverUpdateEntryWithChunkSigner({
				signature: signature as Hex,
				nonce,
				totalChunks,
				content,
				entryId: id,
				address: contractAddress,
				legacyDomain: writer.legacyDomain,
			});

			const payer = getX402Payer(c);
			if (!payer || getAddress(author) !== getAddress(payer)) {
				return c.json({ error: "signer must equal x402 payer" }, 403);
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
				console.error("x402 update entry simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			try {
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
					source: "x402",
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
				return c.json({ pending: { transactionId, author } }, 202);
			} catch (err) {
				console.error("x402 update entry error:", err);
				return c.json({ error: "error during entry update" }, 500);
			}
		},
	)
	.post(
		"/x402/writer/:address/entry/:id/delete",
		addressAndIDParamSchema,
		deleteEntryJsonValidator,
		async (c) => {
			const { address, id } = c.req.valid("param");
			const contractAddress = getAddress(address);
			const { signature, nonce } = c.req.valid("json");

			const writer = await db.getWriter(contractAddress);
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
				address: contractAddress,
				legacyDomain: writer.legacyDomain,
			});

			const payer = getX402Payer(c);
			if (!payer || getAddress(signer) !== getAddress(payer)) {
				return c.json({ error: "signer must equal x402 payer" }, 403);
			}
			if (entry.author.toLowerCase() !== signer.toLowerCase()) {
				return c.json({ error: "previous author does not match" }, 400);
			}

			const args = { signature, nonce: Number(nonce), id: Number(id) };
			try {
				await simulateContractOrThrow({
					to: contractAddress,
					functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args: [signature, Number(nonce), Number(id)],
				});
			} catch (err) {
				console.error("x402 delete entry simulation failed:", err);
				return c.json(
					{ error: `simulation failed: ${humanizeSimulateError(err)}` },
					400,
				);
			}
			try {
				const { wallet, nonce: relayNonce } = await relay.sendTransaction({
					to: contractAddress,
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
					source: "x402",
					targetAddress: contractAddress,
				});
				watchRelayReceipt({
					txId: transactionId,
					wallet,
					nonce: relayNonce,
					chainId: BigInt(env.TARGET_CHAIN_ID),
					functionSignature: DELETE_ENTRY_FUNCTION_SIGNATURE,
					args,
				});
				return c.json({ pending: { transactionId, signer } }, 202);
			} catch (err) {
				console.error("x402 delete entry error:", err);
				return c.json({ error: "error during entry deletion" }, 500);
			}
		},
	);

export default x402Routes;
