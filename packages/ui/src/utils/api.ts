import { hc } from "hono/client";
import type { Hex } from "viem";
import type { Api } from "./../../../server/src/index";

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
	const res = await client.api.create.$post({
		json,
	});
	if (!res.ok) {
		throw new Error(res.statusText);
	}
	return res.json();
}
