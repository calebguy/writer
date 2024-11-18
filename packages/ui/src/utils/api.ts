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

export async function getAuthor(address: Hex) {
	const res = await client.api.author[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function createFromFactory(json: {
	admin: string;
	managers: string[];
	title: string;
}) {
	const res = await client.api.factory.create.$post({
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function createWithChunk({
	address,
	...json
}: {
	address: string;
	signature: string;
	nonce: number;
	chunkCount: number;
	chunkContent: string;
}) {
	const res = await client.api.writer[":address"].createWithChunk.$post({
		param: { address },
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export type GetWritersResponse = InferResponseType<
	(typeof client.api.author)[":address"]["$get"]
>;
