import { Db } from "db";
import { env } from "../utils/env";

export const db = new Db(env.DATABASE_URL);
