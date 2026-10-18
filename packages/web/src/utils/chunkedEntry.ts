import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Hex } from "viem";
import {
	addEntryChunk,
	createWithChunk,
	getTransactionStatus,
	getWriter,
} from "./api";
import { splitEncodedContent } from "./contentChunks";
import {
	type SignedEntryChunk,
	signAddChunk,
	signCreateWithChunk,
} from "./signer";

const ENTRY_INDEX_TIMEOUT_MS = 5 * 60 * 1_000;
const ENTRY_INDEX_POLL_INTERVAL_MS = 2_000;

export class PartialEntryCreationError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "PartialEntryCreationError";
	}
}

type CreateChunkedEntryInput = {
	wallet: ConnectedWallet;
	address: Hex;
	legacyDomain: boolean;
	encodedContent: string;
	authToken: string;
	onSigningChange?: (isSigning: boolean) => void;
	decompressed?: string;
	author?: string;
};

export async function createChunkedEntry(input: CreateChunkedEntryInput) {
	const chunks = splitEncodedContent(input.encodedContent);
	const createSignature = await signCreateChunk(input, chunks);
	const created = await createWithChunk({
		address: input.address,
		authToken: input.authToken,
		...createSignature,
		decompressed: input.decompressed,
		author: input.author,
	});
	if (chunks.length === 1) return created;

	try {
		const entryId = await waitForCreatedEntryId(
			input.address,
			created.pending.transactionId,
		);
		const chunkSignatures = await signRemainingChunks(input, entryId, chunks);
		await Promise.all(
			chunkSignatures.map((signedChunk) =>
				addEntryChunk({
					address: input.address,
					id: entryId,
					authToken: input.authToken,
					...signedChunk,
				}),
			),
		);
		return created;
	} catch (error) {
		throw new PartialEntryCreationError(
			"The first chunk was created, but the remaining chunks could not be submitted",
			{ cause: error },
		);
	}
}

async function signCreateChunk(
	input: CreateChunkedEntryInput,
	chunks: readonly string[],
) {
	input.onSigningChange?.(true);
	try {
		return await signCreateWithChunk(input.wallet, {
			address: input.address,
			legacyDomain: input.legacyDomain,
			chunkCount: chunks.length,
			chunkContent: chunks[0],
		});
	} finally {
		input.onSigningChange?.(false);
	}
}

async function signRemainingChunks(
	input: CreateChunkedEntryInput,
	entryId: number,
	chunks: readonly string[],
) {
	input.onSigningChange?.(true);
	try {
		const signedChunks: SignedEntryChunk[] = [];
		for (const [offset, content] of chunks.slice(1).entries()) {
			signedChunks.push(
				await signAddChunk(input.wallet, {
					address: input.address,
					legacyDomain: input.legacyDomain,
					entryId,
					index: offset + 1,
					content,
				}),
			);
		}
		return signedChunks;
	} finally {
		input.onSigningChange?.(false);
	}
}

async function waitForCreatedEntryId(
	address: Hex,
	transactionId: string,
): Promise<number> {
	const deadline = Date.now() + ENTRY_INDEX_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const [transactionResult, writerResult] = await Promise.allSettled([
			getTransactionStatus(transactionId),
			getWriter(address),
		]);
		if (
			transactionResult.status === "fulfilled" &&
			transactionResult.value.status === "ABANDONED"
		) {
			throw new Error(
				transactionResult.value.error ?? "Entry creation was abandoned",
			);
		}
		if (writerResult.status === "fulfilled") {
			const entry = writerResult.value.entries.find(
				(candidate) =>
					candidate.createdAtTransactionId === transactionId &&
					candidate.onChainId != null,
			);
			if (entry?.onChainId != null) return Number(entry.onChainId);
		}
		await delay(ENTRY_INDEX_POLL_INTERVAL_MS);
	}
	throw new Error("Timed out waiting for the first chunk to be indexed");
}

function delay(milliseconds: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
