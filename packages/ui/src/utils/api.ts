import type { InferResponseType } from "hono/client";
import { hc } from "hono/client";
import type { Api } from "server/src/server";
import type { Hex } from "viem";

const client = hc<Api>("/");

export async function getWriter(address: Hex) {
	const res = await client.api.writer[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getWriters(address: Hex) {
	const res = await client.api.account[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function createNewWriter(json: {
	admin: string;
	managers: string[];
	title: string;
}) {
	const res = await client.api.writer.$post({
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export type GetWritersResponse = InferResponseType<
	(typeof client.api.account)[":address"]["$get"]
>;
