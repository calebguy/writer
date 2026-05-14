import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(request: Request) {
	const docsPath = path.join(process.cwd(), "public", "DOCS.md");
	const markdown = await readFile(docsPath, "utf8");
	const origin = new URL(request.url).origin;

	return new Response(markdown, {
		status: 200,
		headers: {
			"content-type": "text/markdown; charset=utf-8",
			"cache-control": "public, max-age=300, stale-while-revalidate=3600",
			vary: "Accept",
			link: `<${origin}/docs>; rel="alternate"; type="text/html", <${origin}/docs.md>; rel="self"; type="text/markdown"`,
		},
	});
}
