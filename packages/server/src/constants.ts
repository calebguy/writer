import { AsyncLocalStorage } from "node:async_hooks";

import { Client } from "pg";
import { createPublicClient, http } from "viem";
import { env } from "./env";

import { Db } from "db";
import { optimism } from "viem/chains";

export const CREATE_FUNCTION_SIGNATURE =
	"create(string title, address admin, address[] managers, bool publicWritable, bytes32 salt)";
export const CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE =
	"createWithChunkWithSig(bytes signature, uint256 nonce, uint256 chunkCount, string chunkContent)";
export const UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE =
	"updateWithSig(bytes signature, uint256 nonce, uint256 id, uint256 totalChunks, string content)";
export const SET_TITLE_WITH_SIG_FUNCTION_SIGNATURE =
	"setTitleWithSig(bytes signature, uint256 nonce, string newTitle)";
export const DELETE_ENTRY_FUNCTION_SIGNATURE =
	"removeWithSig(bytes signature, uint256 nonce, uint256 id)";
export const SET_HEX_FUNCTION_SIGNATURE =
	"setHexWithSig(bytes signature, uint256 nonce, bytes32 hexColor)";

const fallbackDb = new Db(env.DATABASE_URL);
const databaseContext = new AsyncLocalStorage<Db | undefined>();

function currentDb(): Db {
	return databaseContext.getStore() ?? fallbackDb;
}

export async function runWithHyperdriveDatabase<T>(
	connectionString: string,
	callback: () => T | Promise<T>,
): Promise<T> {
	const client = new Client({ connectionString });
	await client.connect();
	return databaseContext.run(Db.fromClient(client), callback);
}

export const db = new Proxy(fallbackDb, {
	get(_target, property, receiver) {
		const activeDb = currentDb();
		const value = Reflect.get(activeDb, property, receiver);
		return typeof value === "function" ? value.bind(activeDb) : value;
	},
}) as Db;
export const publicClient = createPublicClient({
	chain: optimism,
	transport: http(env.RPC_URL),
});
