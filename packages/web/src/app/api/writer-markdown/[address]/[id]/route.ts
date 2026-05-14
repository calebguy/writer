import { env } from "@/utils/env";
import { type Hex, getAddress, isAddress } from "viem";

type EntryResponse = {
	entry?: {
		decompressed?: string | null;
		raw?: string | null;
		version?: string | null;
		deletedAt?: string | Date | null;
	};
	error?: string;
};

type RouteContext = {
	params: Promise<{
		address: string;
		id: string;
	}>;
};

function markdownResponse(markdown: string, htmlUrl: string, markdownUrl: string) {
	return new Response(markdown, {
		status: 200,
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=60, stale-while-revalidate=300",
			vary: "Accept",
			link: `<${htmlUrl}>; rel="alternate"; type="text/html", <${markdownUrl}>; rel="self"; type="text/markdown"`,
		},
	});
}

function textResponse(message: string, status: number) {
	return new Response(`${message}\n`, {
		status,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "no-store",
			vary: "Accept",
		},
	});
}

export async function GET(request: Request, context: RouteContext) {
	const { address: addressParam, id } = await context.params;
	if (!isAddress(addressParam)) {
		return textResponse("invalid writer address", 400);
	}

	const entryId = Number(id);
	if (!Number.isSafeInteger(entryId) || entryId < 0) {
		return textResponse("invalid entry id", 400);
	}

	const address = getAddress(addressParam) as Hex;
	const origin = new URL(request.url).origin;
	const htmlUrl = `${origin}/writer/${address}/${entryId}`;
	const markdownUrl = `${htmlUrl}.md`;
	const apiUrl = new URL(
		`/writer/${address}/entry/${entryId}`,
		env.NEXT_PUBLIC_BASE_URL,
	);
	const apiResponse = await fetch(apiUrl, { cache: "no-store" });
	const body = (await apiResponse.json().catch(() => null)) as EntryResponse | null;

	if (!apiResponse.ok) {
		return textResponse(
			body?.error ?? apiResponse.statusText ?? "entry not found",
			apiResponse.status,
		);
	}

	const entry = body?.entry;
	if (!entry || entry.deletedAt) {
		return textResponse("entry not found", 404);
	}

	if (typeof entry.decompressed === "string") {
		return markdownResponse(entry.decompressed, htmlUrl, markdownUrl);
	}

	if (entry.version?.startsWith("enc:") || entry.raw?.startsWith("enc:")) {
		return textResponse("entry is encrypted; raw markdown is unavailable", 403);
	}

	if (typeof entry.raw === "string") {
		return markdownResponse(entry.raw, htmlUrl, markdownUrl);
	}

	return textResponse("raw markdown is unavailable", 404);
}
