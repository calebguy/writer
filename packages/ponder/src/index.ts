import { Db } from "db";
import { AppEnv, env } from "../utils/env";

export const db = new Db(env.DATABASE_URL, env.APP_ENV === AppEnv.Production);
