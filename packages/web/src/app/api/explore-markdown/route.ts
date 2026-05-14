import { env } from "@/utils/env";

type PublicWriter = {
	address: string;
	title?: string | null;
	admin?: string | null;
	publicCount?: number | null;
	privateCount?: number | null;
	publicWritable?: boolean | null;
	createdAt?: string | Date | null;
};

type Entry = {
	onChainId?: string | number | null;
	decompressed?: string | null;
	raw?: string | null;
	version?: string | null;
	deletedAt?: string | Date | null;
	createdAt?: string | Date | null;
};

type WriterDetail = PublicWriter & {
	entries?: Entry[];
};

function titleFor(writer: PublicWriter) {
	return writer.title?.trim() || writer.address;
}

function isPublicEntry(entry: Entry) {
	return !entry.deletedAt && !entry.version?.startsWith("enc:") && !entry.raw?.startsWith("enc:");
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
	return line.replace(/^#+\s*/, "").slice(0, 120);
}

async function fetchJson<T>(url: URL): Promise<T | null> {
	const response = await fetch(url, {
		next: { revalidate: 60 },
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		return null;
	}
	return (await response.json().catch(() => null)) as T | null;
}

export async function GET(request: Request) {
	const origin = new URL(request.url).origin;
	const publicWritersUrl = new URL("/writer/public", env.NEXT_PUBLIC_BASE_URL);
	const publicWritersBody = await fetchJson<{ writers?: PublicWriter[] }>(
		publicWritersUrl,
	);
	const writers = publicWritersBody?.writers ?? [];

	const writerDetails: WriterDetail[] = await Promise.all(
		writers.slice(0, 50).map(async (writer) => {
			const detailUrl = new URL(
				`/writer/${writer.address}`,
				env.NEXT_PUBLIC_BASE_URL,
			);
			const detailBody = await fetchJson<{ writer?: WriterDetail }>(detailUrl);
			return detailBody?.writer ?? writer;
		}),
	);

	const lines: string[] = [
		"# Explore Writer",
		"",
		"Public Writer Places and public entries discoverable by agents.",
		"",
		`HTML: ${origin}/explore`,
		`Markdown: ${origin}/explore.md`,
		"",
		"## Public Places",
		"",
	];

	if (writerDetails.length === 0) {
		lines.push("No public Writer Places are currently available.", "");
	} else {
		for (const writer of writerDetails) {
			const htmlUrl = `${origin}/writer/${writer.address}`;
			const placeMarkdownUrl = `${origin}/writer/${writer.address}.md`;
			lines.push(`### [${titleFor(writer)}](${htmlUrl})`, "");
			lines.push(`- Address: \`${writer.address}\``);
			if (writer.admin) {
				lines.push(`- Admin: \`${writer.admin}\``);
			}
			lines.push(`- Public entries: ${writer.publicCount ?? 0}`);
			lines.push(`- Private entries: ${writer.privateCount ?? 0}`);
			lines.push(`- Public writable: ${writer.publicWritable ? "yes" : "no"}`);
			lines.push(`- HTML: ${htmlUrl}`);
			lines.push(`- Markdown: ${placeMarkdownUrl}`);

			const publicEntries = (writer.entries ?? [])
				.filter(isPublicEntry)
				.filter((entry) => entryId(entry) !== null)
				.slice(0, 5);

			if (publicEntries.length > 0) {
				lines.push("", "Entries:");
				for (const entry of publicEntries) {
					const id = entryId(entry);
					const entryUrl = `${origin}/writer/${writer.address}/${id}`;
					lines.push(
						`- [${summarizeEntry(entry)}](${entryUrl}) — [Markdown](${entryUrl}.md)`,
					);
				}
			}

			lines.push("");
		}
	}

	return new Response(`${lines.join("\n").trim()}\n`, {
		status: 200,
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=60, stale-while-revalidate=300",
			vary: "Accept",
			link: `<${origin}/explore>; rel="alternate"; type="text/html", <${origin}/explore.md>; rel="self"; type="text/markdown"`,
		},
	});
}
