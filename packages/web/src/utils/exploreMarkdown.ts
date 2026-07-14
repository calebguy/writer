export type ExplorePublicWriter = {
	address: string;
	title?: string | null;
	admin?: string | null;
	publicCount?: number | null;
	privateCount?: number | null;
	publicWritable?: boolean | null;
	createdAt?: string | Date | null;
};

export type ExploreEntry = {
	onChainId?: string | number | null;
	decompressed?: string | null;
	raw?: string | null;
	version?: string | null;
	deletedAt?: string | Date | null;
	createdAt?: string | Date | null;
};

export type ExploreWriterDetail = ExplorePublicWriter & {
	entries?: ExploreEntry[];
};

function titleFor(writer: ExplorePublicWriter) {
	return writer.title?.trim() || writer.address;
}

function isPublicEntry(entry: ExploreEntry) {
	return (
		!entry.deletedAt &&
		!entry.version?.startsWith("enc:") &&
		!entry.raw?.startsWith("enc:")
	);
}

function entryId(entry: ExploreEntry) {
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

function summarizeEntry(entry: ExploreEntry) {
	const text = entry.decompressed ?? entry.raw ?? "";
	const line = firstLine(text);
	if (!line) {
		return "Untitled entry";
	}
	return line.replace(/^#+\s*/, "").slice(0, 120);
}

function countableEntries(writer: ExploreWriterDetail) {
	return (writer.entries ?? []).filter(
		(entry) => !entry.deletedAt && entryId(entry) !== null,
	);
}

function publicEntriesFor(writer: ExploreWriterDetail) {
	return countableEntries(writer).filter(isPublicEntry);
}

function entryCountsFor(writer: ExploreWriterDetail) {
	if (!writer.entries) {
		return {
			publicCount: writer.publicCount ?? 0,
			privateCount: writer.privateCount ?? 0,
		};
	}

	const entries = countableEntries(writer);
	const publicCount = entries.filter(isPublicEntry).length;
	return {
		publicCount,
		privateCount: entries.length - publicCount,
	};
}

export function renderExploreMarkdown({
	origin,
	writers,
}: {
	origin: string;
	writers: ExploreWriterDetail[];
}) {
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

	if (writers.length === 0) {
		lines.push("No public Writer Places are currently available.", "");
	} else {
		for (const writer of writers) {
			const htmlUrl = `${origin}/writer/${writer.address}`;
			const placeMarkdownUrl = `${origin}/writer/${writer.address}.md`;
			const publicEntries = publicEntriesFor(writer);
			const { publicCount, privateCount } = entryCountsFor(writer);

			lines.push(`### [${titleFor(writer)}](${htmlUrl})`, "");
			lines.push(`- Address: \`${writer.address}\``);
			if (writer.admin) {
				lines.push(`- Admin: \`${writer.admin}\``);
			}
			lines.push(`- Public entries: ${publicCount}`);
			lines.push(`- Private entries: ${privateCount}`);
			lines.push(`- Public writable: ${writer.publicWritable ? "yes" : "no"}`);
			lines.push(`- HTML: ${htmlUrl}`);
			lines.push(`- Markdown: ${placeMarkdownUrl}`);

			if (publicEntries.length > 0) {
				lines.push("", "Entries:");
				for (const entry of publicEntries.slice(0, 5)) {
					const id = entryId(entry);
					const entryUrl = `${origin}/writer/${writer.address}/${id}`;
					const summary = summarizeEntry(entry);
					lines.push(
						`- [${summary}](${entryUrl}) — [Markdown](${entryUrl}.md)`,
					);
				}
			}

			lines.push("");
		}
	}

	return `${lines.join("\n").trim()}\n`;
}
