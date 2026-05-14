import { renderDocsMarkdown } from "@/content/docs";

export async function GET(request: Request) {
	const markdown = renderDocsMarkdown();
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
