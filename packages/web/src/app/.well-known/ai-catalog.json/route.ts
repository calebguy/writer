const SITE_URL = "https://writer.place";
const API_URL = "https://api.writer.place";

export async function GET() {
	return Response.json(
		{
			specVersion: "1.0",
			host: {
				displayName: "Writer",
				identifier: SITE_URL,
				url: SITE_URL,
			},
			entries: [
				{
					identifier: "urn:writer:agent-guide",
					displayName: "Writer Agent Guide",
					type: "text/markdown",
					url: `${SITE_URL}/agents.md`,
					description:
						"Operational guide for agents using Writer safely, including CLI and SDK examples, x402 payment rules, and publishing policy.",
					capabilities: ["agent-guidance", "safety-policy", "x402-writes"],
					representativeQueries: [
						"how can an agent publish to Writer",
						"what safety policy should an agent follow before writing onchain",
					],
				},
				{
					identifier: "urn:writer:llms-summary",
					displayName: "Writer llms.txt",
					type: "text/markdown",
					url: `${SITE_URL}/llms.txt`,
					description:
						"Concise LLM entry point with prioritized links to Writer docs, APIs, Markdown surfaces, and agent tools.",
					capabilities: ["llm-context", "link-map"],
					representativeQueries: [
						"what is Writer",
						"where are Writer's machine-readable resources",
					],
				},
				{
					identifier: "urn:writer:agent-manifest",
					displayName: "Writer Agent Manifest",
					type: "application/vnd.writer.agent+json",
					url: `${SITE_URL}/.well-known/writer-agent.json`,
					description:
						"Writer-specific discovery manifest that links Markdown reads, OpenAPI, x402 capabilities, and signer/payer invariants.",
					capabilities: ["discovery", "markdown-reads", "x402-writes"],
					representativeQueries: [
						"discover Writer agent capabilities",
						"find Writer markdown and x402 endpoints",
					],
				},
				{
					identifier: "urn:writer:openapi",
					displayName: "Writer OpenAPI",
					type: "application/vnd.oai.openapi+json;version=3.1",
					url: `${SITE_URL}/openapi.json`,
					description:
						"OpenAPI 3.1 schema for public reads, Markdown representations, and x402-paid agent write endpoints.",
					capabilities: [
						"rest-api",
						"public-reads",
						"markdown-reads",
						"x402-writes",
					],
					representativeQueries: [
						"get Writer API schema",
						"which Writer endpoints create entries with x402",
					],
				},
				{
					identifier: "urn:writer:x402-capabilities",
					displayName: "Writer x402 Capabilities",
					type: "application/json",
					url: `${API_URL}/x402/capabilities`,
					description:
						"Live pricing, payment network, pay-to address, endpoint list, and signer/payer requirements for Writer x402 writes.",
					capabilities: ["payments", "x402", "pricing", "write-capabilities"],
					representativeQueries: [
						"what does it cost to publish an entry to Writer",
						"what x402 network does Writer use",
					],
				},
				{
					identifier: "urn:writer:public-explore-markdown",
					displayName: "Writer Public Place Discovery",
					type: "text/markdown",
					url: `${SITE_URL}/explore.md`,
					description:
						"Markdown index of public Writer Places and public entry links discoverable by agents.",
					capabilities: ["public-content-discovery", "markdown-reads"],
					representativeQueries: [
						"list public Writer Places",
						"find public Writer entries as Markdown",
					],
				},
			],
		},
		{
			headers: {
				"cache-control": "public, max-age=300, stale-while-revalidate=3600",
			},
		},
	);
}
