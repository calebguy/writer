import {
	type ExplorePublicWriter,
	type ExploreWriterDetail,
	renderExploreMarkdown,
} from "@/utils/exploreMarkdown";
import { env } from "@/utils/env";

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
	const publicWritersBody = await fetchJson<{
		writers?: ExplorePublicWriter[];
	}>(publicWritersUrl);
	const writers = publicWritersBody?.writers ?? [];

	const writerDetails: ExploreWriterDetail[] = await Promise.all(
		writers.slice(0, 50).map(async (writer) => {
			const detailUrl = new URL(
				`/writer/${writer.address}`,
				env.NEXT_PUBLIC_BASE_URL,
			);
			const detailBody = await fetchJson<{ writer?: ExploreWriterDetail }>(
				detailUrl,
			);
			return detailBody?.writer ? { ...writer, ...detailBody.writer } : writer;
		}),
	);

	const markdown = renderExploreMarkdown({ origin, writers: writerDetails });

	return new Response(markdown, {
		status: 200,
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=60, stale-while-revalidate=300",
			vary: "Accept",
			link: `<${origin}/explore>; rel="alternate"; type="text/html", <${origin}/explore.md>; rel="self"; type="text/markdown"`,
		},
	});
}
