import { Db } from "db";
import { env } from "../env";

export const db = new Db(env.DATABASE_URL);
