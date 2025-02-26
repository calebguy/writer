import { AppEnv, env } from "./env";

import { Db } from "db";

export const CREATE_FUNCTION_SIGNATURE =
	"create(string title, address admin, address[] managers, bytes32 salt)";
export const CREATE_WITH_CHUNK_WITH_SIG_FUNCTION_SIGNATURE =
	"createWithChunkWithSig(bytes signature, uint256 nonce, uint256 chunkCount, string chunkContent)";
export const UPDATE_ENTRY_WITH_SIG_FUNCTION_SIGNATURE =
	"updateWithSig(bytes signature, uint256 nonce, uint256 id, uint256 totalChunks, string content)";
export const DELETE_ENTRY_FUNCTION_SIGNATURE =
	"removeWithSig(bytes signature, uint256 nonce, uint256 id)";
export const SET_HEX_FUNCTION_SIGNATURE =
	"setHexWithSig(bytes signature, uint256 nonce, bytes32 hexColor)";

export const db = new Db(env.DATABASE_URL, env.APP_ENV === AppEnv.Production);
