import type { InferResponseType } from "hono/client";
import { hc } from "hono/client";
import type { Api } from "server/src/server";
import type { Hex } from "viem";

const client = hc<Api>("/");

export async function getMe() {
	const res = await client.api.me.$get();
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function setColor({
	signature,
	nonce,
	hexColor,
}: {
	signature: string;
	nonce: number;
	hexColor: string;
}) {
	const res = await client.api["color-registry"].set.$post({
		json: { signature, nonce, hexColor },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getWriter(address: Hex) {
	const res = await client.api.writer[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).writer;
}

export async function editEntry({
	address,
	id,
	signature,
	nonce,
	totalChunks,
	content,
}: {
	address: string;
	id: number;
	signature: string;
	nonce: number;
	totalChunks: number;
	content: string;
}) {
	const res = await client.api.writer[":address"].entry[":id"].update.$post({
		param: { address, id: String(id) },
		json: { signature, nonce, totalChunks, content },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function deleteEntry({
	address,
	id,
	signature,
	nonce,
}: { address: string; id: number; signature: string; nonce: number }) {
	const res = await client.api.writer[":address"].entry[":id"].delete.$post({
		param: { address, id: String(id) },
		json: { signature, nonce },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getWritersByManager(address: Hex) {
	const res = await client.api.manager[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).writers;
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
	(typeof client.api.manager)[":address"]["$get"]
>;
export type Writer = GetWritersResponse["writers"][number];
