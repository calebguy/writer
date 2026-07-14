import type { MetadataRoute } from "next";

const SITE_URL = "https://writer.place";

const DISCOVERY_URLS = [
	"/",
	"/home",
	"/explore",
	"/explore.md",
	"/docs",
	"/docs.md",
	"/agents.md",
	"/agents.txt",
	"/llms.txt",
	"/openapi.json",
	"/.well-known/ai-catalog.json",
	"/.well-known/writer-agent.json",
	"/.well-known/x402.json",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
	return DISCOVERY_URLS.map((path) => ({
		url: `${SITE_URL}${path}`,
		lastModified: new Date(),
	}));
}
