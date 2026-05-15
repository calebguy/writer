const SITE_URL = "https://writer.place";
const API_URL = "https://api.writer.place";

export async function GET() {
	return Response.json(
		{
			name: "Writer",
			description:
				"Onchain writing platform for public and encrypted entries, with public Markdown reads and x402-paid agent writes.",
			site: SITE_URL,
			api: API_URL,
			agents: `${SITE_URL}/agents.md`,
			llms: `${SITE_URL}/llms.txt`,
			docs: `${SITE_URL}/docs.md`,
			explore: `${SITE_URL}/explore.md`,
			openapi: `${SITE_URL}/openapi.json`,
			x402Capabilities: `${SITE_URL}/.well-known/x402.json`,
			markdown: {
				docs: `${SITE_URL}/docs.md`,
				explore: `${SITE_URL}/explore.md`,
				place: `${SITE_URL}/writer/:address.md`,
				entry: `${SITE_URL}/writer/:address/:id.md`,
				contentNegotiation:
					"Send Accept: text/markdown to /docs, /explore, /writer/:address, or /writer/:address/:id.",
			},
			x402: {
				capabilities: `${SITE_URL}/.well-known/x402.json`,
				apiCapabilities: `${API_URL}/x402/capabilities`,
				endpoints: [
					`${API_URL}/x402/factory/create`,
					`${API_URL}/x402/writer/:address/entry/createWithChunk`,
					`${API_URL}/x402/writer/:address/entry/:id/update`,
					`${API_URL}/x402/writer/:address/entry/:id/delete`,
				],
				invariants: [
					"Place creation payer must equal requested admin address.",
					"Entry create, update, and delete payer must equal the recovered EIP-712 signer.",
					"Entry IDs are onchain IDs and may be 0.",
				],
			},
		},
		{
			headers: {
				"cache-control": "public, max-age=300, stale-while-revalidate=3600",
			},
		},
	);
}
