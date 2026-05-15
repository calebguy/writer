const API_URL = "https://api.writer.place";

export async function GET() {
	try {
		const response = await fetch(`${API_URL}/x402/capabilities`, {
			next: { revalidate: 300 },
			headers: { accept: "application/json" },
		});

		if (!response.ok) {
			throw new Error(`capabilities request failed: ${response.status}`);
		}

		const capabilities = await response.json();
		return Response.json(capabilities, {
			headers: {
				"cache-control": "public, max-age=300, stale-while-revalidate=3600",
			},
		});
	} catch {
		return Response.json(
			{
				version: "1.0",
				name: "Writer x402 capabilities",
				description:
					"Programmatic Writer Place and entry writes paid with x402. Fetch the API capabilities endpoint for current pricing and payment configuration.",
				capabilitiesUrl: `${API_URL}/x402/capabilities`,
				docs: {
					agents: "https://writer.place/agents.md",
					openapi: "https://writer.place/openapi.json",
				},
			},
			{
				status: 503,
				headers: {
					"cache-control": "public, max-age=60, stale-while-revalidate=300",
				},
			},
		);
	}
}
