import { PrivyClient } from "@privy-io/server-auth";
import { env } from "./env";

import { Db } from "db";

export const TARGET_CHAIN_ID = 10;
export const CREATE_FUNCTION_SIGNATURE =
	"create(string title, address admin, address[] managers, bytes32 salt)";
export const CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE =
	"createWithChunkWithSig(bytes signature, uint256 nonce, uint256 chunkCount, string chunkContent)";

export const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_SECRET);
export const db = new Db(env.DATABASE_URL);
