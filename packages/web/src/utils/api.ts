import type { InferResponseType } from "hono/client";
import { hc } from "hono/client";
import type { Api } from "server/src/server";
import { type Hex, getAddress } from "viem";

if (!process.env.NEXT_PUBLIC_BASE_URL) {
	throw new Error("NEXT_PUBLIC_BASE_URL is not set");
}

const client = hc<Api>(process.env.NEXT_PUBLIC_BASE_URL);

export async function deleteWriter(address: Hex | string) {
	const res = await client.writer[":address"].$delete({
		param: { address: getAddress(address) },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getMe(address: Hex) {
	const res = await client.me[":address"].$get({
		param: { address },
	});
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
	const res = await client["color-registry"].set.$post({
		json: { signature, nonce, hexColor },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getWriter(address: Hex) {
	const res = await client.writer[":address"].$get({
		param: { address },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).writer;
}

export async function getEntry(address: Hex, id: number) {
	const res = await client.writer[":address"].entry[":id"].$get({
		param: { address, id: String(id) },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).entry;
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
	const res = await client.writer[":address"].entry[":id"].update.$post({
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
	const res = await client.writer[":address"].entry[":id"].delete.$post({
		param: { address, id: String(id) },
		json: { signature, nonce },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export async function getWritersByManager(address: Hex | string) {
	const res = await client.manager[":address"].$get({
		param: { address: getAddress(address) },
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return (await res.json()).writers;
}

export async function factoryCreate(json: {
	admin: string | Hex;
	managers: string[] | Hex[];
	title: string;
}) {
	const res = await client.factory.create.$post({
		json: {
			admin: getAddress(json.admin),
			managers: json.managers.map((manager) => getAddress(manager)),
			title: json.title,
		},
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
	const res = await client.writer[":address"].entry.createWithChunk.$post({
		param: { address },
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}

export type GetWritersResponse = InferResponseType<
	(typeof client.manager)[":address"]["$get"]
>;
export type Writer = GetWritersResponse["writers"][number];
export type Entry = Writer["entries"][number];
