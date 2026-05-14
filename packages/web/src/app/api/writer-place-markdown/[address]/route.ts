import { env } from "@/utils/env";
import { type Hex, getAddress, isAddress } from "viem";

type Entry = {
	onChainId?: string | number | null;
	decompressed?: string | null;
	raw?: string | null;
	version?: string | null;
	deletedAt?: string | Date | null;
	author?: string | null;
	createdAt?: string | Date | null;
	updatedAt?: string | Date | null;
	createdAtBlock?: string | number | null;
	updatedAtBlock?: string | number | null;
};

type WriterResponse = {
	writer?: {
		address: string;
		storageAddress?: string | null;
		storageId?: string | null;
		title?: string | null;
		admin?: string | null;
		managers?: string[] | null;
		publicCount?: number | null;
		privateCount?: number | null;
		publicWritable?: boolean | null;
		createdAt?: string | Date | null;
		createdAtBlock?: string | number | null;
		entries?: Entry[];
	};
	error?: string;
};

type RouteContext = {
	params: Promise<{
		address: string;
	}>;
};

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

function yamlString(value: string) {
	return JSON.stringify(value);
}

function titleFor(writer: NonNullable<WriterResponse["writer"]>) {
	return writer.title?.trim() || writer.address;
}

function isPublicEntry(entry: Entry) {
	return (
		!entry.deletedAt &&
		!entry.version?.startsWith("enc:") &&
		!entry.raw?.startsWith("enc:")
	);
}

function entryId(entry: Entry) {
	if (entry.onChainId === null || entry.onChainId === undefined) {
		return null;
	}
	return String(entry.onChainId);
}

function firstLine(value: string) {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find(Boolean);
}

function summarizeEntry(entry: Entry) {
	const text = entry.decompressed ?? entry.raw ?? "";
	const line = firstLine(text);
	if (!line) {
		return "Untitled entry";
	}
	return line.replace(/^#+\s*/, "").replace(/[\[\]]/g, "").slice(0, 120);
}

export async function GET(request: Request, context: RouteContext) {
	const { address: addressParam } = await context.params;
	if (!isAddress(addressParam)) {
		return textResponse("invalid writer address", 400);
	}

	const address = getAddress(addressParam) as Hex;
	const origin = new URL(request.url).origin;
	const htmlUrl = `${origin}/writer/${address}`;
	const markdownUrl = `${htmlUrl}.md`;
	const apiUrl = new URL(`/writer/${address}`, env.NEXT_PUBLIC_BASE_URL);
	const apiResponse = await fetch(apiUrl, {
		next: { revalidate: 60 },
		headers: { accept: "application/json" },
	});
	const body = (await apiResponse.json().catch(() => null)) as WriterResponse | null;

	if (!apiResponse.ok) {
		return textResponse(
			body?.error ?? apiResponse.statusText ?? "writer not found",
			apiResponse.status,
		);
	}

	const writer = body?.writer;
	if (!writer) {
		return textResponse("writer not found", 404);
	}

	const publicEntries = (writer.entries ?? [])
		.filter(isPublicEntry)
		.filter((entry) => entryId(entry) !== null);

	const lines: string[] = [
		"---",
		`type: ${yamlString("writer-place")}`,
		`title: ${yamlString(titleFor(writer))}`,
		`address: ${yamlString(address)}`,
	];
	if (writer.storageAddress) {
		lines.push(`storageAddress: ${yamlString(writer.storageAddress)}`);
	}
	if (writer.storageId) {
		lines.push(`storageId: ${yamlString(writer.storageId)}`);
	}
	if (writer.admin) {
		lines.push(`admin: ${yamlString(writer.admin)}`);
	}
	lines.push(
		`publicWritable: ${writer.publicWritable ? "true" : "false"}`,
		`publicEntries: ${publicEntries.length}`,
		`totalEntries: ${writer.entries?.length ?? 0}`,
	);
	if (writer.createdAt) {
		lines.push(`createdAt: ${yamlString(String(writer.createdAt))}`);
	}
	if (writer.createdAtBlock) {
		lines.push(`createdAtBlock: ${yamlString(String(writer.createdAtBlock))}`);
	}
	lines.push(
		`canonical: ${yamlString(htmlUrl)}`,
		`markdown: ${yamlString(markdownUrl)}`,
		"---",
		"",
		`# ${titleFor(writer)}`,
		"",
		`Writer Place: \`${address}\``,
		"",
		`- HTML: ${htmlUrl}`,
		`- Markdown: ${markdownUrl}`,
	);

	if (writer.admin) {
		lines.push(`- Admin: \`${writer.admin}\``);
	}
	if (writer.managers?.length) {
		lines.push(`- Managers: ${writer.managers.map((m) => `\`${m}\``).join(", ")}`);
	}
	lines.push(`- Public writable: ${writer.publicWritable ? "yes" : "no"}`);
	lines.push(`- Public entries: ${publicEntries.length}`);
	lines.push(`- Total entries: ${writer.entries?.length ?? 0}`);
	lines.push("", "## Public Entries", "");

	if (publicEntries.length === 0) {
		lines.push("No public entries are currently available.", "");
	} else {
		for (const entry of publicEntries) {
			const id = entryId(entry);
			const entryUrl = `${origin}/writer/${address}/${id}`;
			lines.push(
				`- [${summarizeEntry(entry)}](${entryUrl}) — [Markdown](${entryUrl}.md)`,
			);
		}
		lines.push("");
	}

	return new Response(`${lines.join("\n").trim()}\n`, {
		status: 200,
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=60, stale-while-revalidate=300",
			vary: "Accept",
			link: `<${htmlUrl}>; rel="alternate"; type="text/html", <${markdownUrl}>; rel="self"; type="text/markdown"`,
		},
	});
}
