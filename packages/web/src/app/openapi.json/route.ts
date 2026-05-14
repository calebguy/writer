const openApiDocument = {
	openapi: "3.1.0",
	info: {
		title: "Writer API",
		version: "0.1.0",
		description:
			"Public read and x402 agent write API for Writer, an onchain writing platform.",
		license: {
			name: "MIT",
		},
	},
	servers: [
		{
			url: "https://api.writer.place",
			description: "Production API",
		},
	],
	externalDocs: {
		description: "Agent guide",
		url: "https://writer.place/agents.md",
	},
	tags: [
		{ name: "Read", description: "Public read endpoints" },
		{ name: "Agents", description: "x402-paid programmatic write endpoints" },
		{ name: "Markdown", description: "Agent-friendly Markdown representations" },
	],
	paths: {
		"/writer/public": {
			get: {
				tags: ["Read"],
				summary: "List public Writer Places",
				responses: {
					"200": {
						description: "Public writers",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/PublicWritersResponse" },
							},
						},
					},
				},
			},
		},
		"/writer/{address}": {
			get: {
				tags: ["Read"],
				summary: "Get a Writer Place and entries",
				parameters: [{ $ref: "#/components/parameters/Address" }],
				responses: {
					"200": {
						description: "Writer Place",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/WriterResponse" },
							},
						},
					},
					"404": { $ref: "#/components/responses/NotFound" },
				},
			},
		},
		"/writer/{address}/entry/{id}": {
			get: {
				tags: ["Read"],
				summary: "Get a confirmed entry by onchain ID",
				parameters: [
					{ $ref: "#/components/parameters/Address" },
					{ $ref: "#/components/parameters/EntryId" },
				],
				responses: {
					"200": {
						description: "Entry",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/EntryResponse" },
							},
						},
					},
					"404": { $ref: "#/components/responses/NotFound" },
				},
			},
		},
		"/writer/{address}/entry/pending/{id}": {
			get: {
				tags: ["Read"],
				summary: "Get a pending entry by database ID before onchain confirmation",
				parameters: [
					{ $ref: "#/components/parameters/Address" },
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
						description: "Pending database entry ID",
					},
				],
				responses: {
					"200": {
						description: "Pending entry",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/EntryResponse" },
							},
						},
					},
					"404": { $ref: "#/components/responses/NotFound" },
				},
			},
		},
		"/manager/{address}": {
			get: {
				tags: ["Read"],
				summary: "List Writer Places managed by an address",
				parameters: [{ $ref: "#/components/parameters/Address" }],
				responses: {
					"200": {
						description: "Managed writers",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/PublicWritersResponse" },
							},
						},
					},
				},
			},
		},
		"/me/{address}": {
			get: {
				tags: ["Read"],
				summary: "Get user profile metadata for an address",
				parameters: [{ $ref: "#/components/parameters/Address" }],
				responses: {
					"200": {
						description: "User",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UserResponse" },
							},
						},
					},
				},
			},
		},
		"/.well-known/writer-agent.json": {
			get: {
				tags: ["Markdown"],
				servers: [{ url: "https://writer.place", description: "Writer web app" }],
				summary: "Get machine-readable Writer agent discovery manifest",
				responses: {
					"200": {
						description: "Agent discovery manifest",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/AgentManifest" },
							},
						},
					},
				},
			},
		},
		"/writer/{address}.md": {
			get: {
				tags: ["Markdown"],
				servers: [{ url: "https://writer.place", description: "Writer web app" }],
				summary: "Get a Writer Place as Markdown",
				description:
					"Returns a Markdown Place summary with YAML frontmatter, provenance metadata, and links to public entries. The canonical /writer/{address} URL also returns this representation when requested with Accept: text/markdown.",
				parameters: [{ $ref: "#/components/parameters/Address" }],
				responses: {
					"200": { $ref: "#/components/responses/Markdown" },
					"404": { $ref: "#/components/responses/PlainTextNotFound" },
				},
			},
		},
		"/writer/{address}/{id}.md": {
			get: {
				tags: ["Markdown"],
				servers: [{ url: "https://writer.place", description: "Writer web app" }],
				summary: "Get a public Writer entry as Markdown",
				description:
					"Returns a public/plaintext entry as Markdown with YAML provenance frontmatter. Encrypted entries return 403 because the server does not have wallet-derived decryption keys. The canonical /writer/{address}/{id} URL also returns this representation when requested with Accept: text/markdown.",
				parameters: [
					{ $ref: "#/components/parameters/Address" },
					{ $ref: "#/components/parameters/EntryId" },
				],
				responses: {
					"200": { $ref: "#/components/responses/Markdown" },
					"403": { $ref: "#/components/responses/PlainTextForbidden" },
					"404": { $ref: "#/components/responses/PlainTextNotFound" },
				},
			},
		},
		"/x402/factory/create": {
			post: {
				tags: ["Agents"],
				summary: "Create a Writer Place with x402 payment",
				description:
					"The x402 payer must equal the requested admin address. The payer becomes admin and sole manager.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/X402FactoryCreateRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Pending Writer Place",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/X402FactoryCreateResponse" },
							},
						},
					},
					"402": { description: "x402 payment required" },
					"403": { $ref: "#/components/responses/Forbidden" },
				},
			},
		},
		"/x402/writer/{address}/entry/createWithChunk": {
			post: {
				tags: ["Agents"],
				summary: "Create an entry with x402 payment and EIP-712 signature",
				description:
					"The x402 payer must equal the recovered EIP-712 CreateWithChunk signer.",
				parameters: [{ $ref: "#/components/parameters/Address" }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreateEntryRequest" },
						},
					},
				},
				responses: { "200": { $ref: "#/components/responses/PendingAuthor" }, "402": { description: "x402 payment required" }, "403": { $ref: "#/components/responses/Forbidden" } },
			},
		},
		"/x402/writer/{address}/entry/{id}/update": {
			post: {
				tags: ["Agents"],
				summary: "Replace entry content with x402 payment and EIP-712 signature",
				description:
					"The x402 payer must equal the recovered EIP-712 Update signer. The signer must match the existing entry author. The content is the full replacement encoded content string, not a patch.",
				parameters: [
					{ $ref: "#/components/parameters/Address" },
					{ $ref: "#/components/parameters/EntryId" },
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateEntryRequest" },
						},
					},
				},
				responses: { "200": { $ref: "#/components/responses/PendingAuthor" }, "402": { description: "x402 payment required" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } },
			},
		},
		"/x402/writer/{address}/entry/{id}/delete": {
			post: {
				tags: ["Agents"],
				summary: "Delete an entry with x402 payment and EIP-712 signature",
				description:
					"The x402 payer must equal the recovered EIP-712 Remove signer. The signer must match the existing entry author. Deletion updates Writer state and does not erase historical chain data.",
				parameters: [
					{ $ref: "#/components/parameters/Address" },
					{ $ref: "#/components/parameters/EntryId" },
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/DeleteEntryRequest" },
						},
					},
				},
				responses: { "200": { $ref: "#/components/responses/PendingSigner" }, "402": { description: "x402 payment required" }, "403": { $ref: "#/components/responses/Forbidden" }, "404": { $ref: "#/components/responses/NotFound" } },
			},
		},
	},
	components: {
		parameters: {
			Address: {
				name: "address",
				in: "path",
				required: true,
				schema: { $ref: "#/components/schemas/Address" },
				description: "EVM address",
			},
			EntryId: {
				name: "id",
				in: "path",
				required: true,
				schema: { type: "string", pattern: "^[0-9]+$" },
				description: "Onchain entry ID. Entry ID 0 is valid.",
			},
		},
		responses: {
			NotFound: {
				description: "Resource not found",
				content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			},
			Forbidden: {
				description: "Forbidden",
				content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
			},
			PendingAuthor: {
				description: "Pending relay transaction",
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["pending"],
							properties: {
								pending: { $ref: "#/components/schemas/PendingAuthor" },
							},
						},
					},
				},
			},
			PendingSigner: {
				description: "Pending relay transaction",
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["pending"],
							properties: {
								pending: { $ref: "#/components/schemas/PendingSigner" },
							},
						},
					},
				},
			},
			Markdown: {
				description: "Markdown representation",
				content: {
					"text/markdown; charset=utf-8": {
						schema: { type: "string" },
					},
				},
			},
			PlainTextForbidden: {
				description: "Forbidden plain-text response",
				content: {
					"text/plain; charset=utf-8": { schema: { type: "string" } },
				},
			},
			PlainTextNotFound: {
				description: "Not found plain-text response",
				content: {
					"text/plain; charset=utf-8": { schema: { type: "string" } },
				},
			},
		},
		schemas: {
			Address: { type: "string", pattern: "^0x[a-fA-F0-9]{40}$" },
			AgentManifest: {
				type: "object",
				required: ["name", "site", "api", "agents", "docs", "explore", "openapi"],
				properties: {
					name: { type: "string" },
					description: { type: "string" },
					site: { type: "string", format: "uri" },
					api: { type: "string", format: "uri" },
					agents: { type: "string", format: "uri" },
					llms: { type: "string", format: "uri" },
					docs: { type: "string", format: "uri" },
					explore: { type: "string", format: "uri" },
					openapi: { type: "string", format: "uri" },
					markdown: { type: "object" },
					x402: { type: "object" },
				},
			},
			Hex: { type: "string", pattern: "^0x[a-fA-F0-9]*$" },
			Error: {
				type: "object",
				properties: { error: { type: "string" } },
			},
			UserResponse: {
				type: "object",
				properties: { user: { type: ["object", "null"] } },
			},
			PublicWriter: {
				type: "object",
				required: ["address", "title", "admin", "publicCount", "privateCount"],
				properties: {
					address: { $ref: "#/components/schemas/Address" },
					title: { type: "string" },
					admin: { $ref: "#/components/schemas/Address" },
					publicCount: { type: "integer", minimum: 0 },
					privateCount: { type: "integer", minimum: 0 },
					publicWritable: { type: "boolean" },
					createdAt: { type: "string", format: "date-time" },
					createdAtBlock: { type: ["string", "null"] },
				},
			},
			Writer: {
				allOf: [
					{ $ref: "#/components/schemas/PublicWriter" },
					{
						type: "object",
						properties: {
							storageAddress: { $ref: "#/components/schemas/Address" },
							storageId: { type: "string" },
							managers: { type: "array", items: { $ref: "#/components/schemas/Address" } },
							entries: { type: "array", items: { $ref: "#/components/schemas/Entry" } },
						},
					},
				],
			},
			Entry: {
				type: "object",
				properties: {
					id: { type: "string" },
					onChainId: { type: ["string", "null"], description: "Onchain entry ID; 0 is valid." },
					storageAddress: { $ref: "#/components/schemas/Address" },
					author: { $ref: "#/components/schemas/Address" },
					raw: { type: ["string", "null"] },
					version: { type: ["string", "null"], examples: ["br:", "enc:v5:br:"] },
					decompressed: { type: ["string", "null"], description: "Plaintext markdown for public entries. Null/omitted for encrypted entries." },
					deletedAt: { type: ["string", "null"], format: "date-time" },
					createdAtHash: { type: ["string", "null"] },
					updatedAtHash: { type: ["string", "null"] },
				},
			},
			PublicWritersResponse: {
				type: "object",
				required: ["writers"],
				properties: { writers: { type: "array", items: { $ref: "#/components/schemas/PublicWriter" } } },
			},
			WriterResponse: {
				type: "object",
				required: ["writer"],
				properties: { writer: { $ref: "#/components/schemas/Writer" } },
			},
			EntryResponse: {
				type: "object",
				required: ["entry"],
				properties: { entry: { $ref: "#/components/schemas/Entry" } },
			},
			X402FactoryCreateRequest: {
				type: "object",
				required: ["address", "title"],
				properties: {
					address: { $ref: "#/components/schemas/Address", description: "x402 payer and requested admin" },
					title: { type: "string", minLength: 1 },
				},
			},
			X402FactoryCreateResponse: {
				type: "object",
				required: ["writer"],
				properties: {
					writer: {
						allOf: [
							{ $ref: "#/components/schemas/Writer" },
							{
								type: "object",
								properties: {
									transactionId: { type: "string" },
									createdAtHash: { type: "null" },
								},
							},
						],
					},
				},
			},
			CreateEntryRequest: {
				type: "object",
				required: ["signature", "nonce", "chunkCount", "chunkContent"],
				properties: {
					signature: { $ref: "#/components/schemas/Hex" },
					nonce: { type: "integer", minimum: 0 },
					chunkCount: { type: "integer", minimum: 1 },
					chunkContent: { type: "string", description: "Final encoded content string" },
				},
			},
			UpdateEntryRequest: {
				type: "object",
				required: ["signature", "nonce", "totalChunks", "content"],
				properties: {
					signature: { $ref: "#/components/schemas/Hex" },
					nonce: { type: "integer", minimum: 0 },
					totalChunks: { type: "integer", minimum: 1 },
					content: { type: "string", description: "Full replacement encoded content string" },
				},
			},
			DeleteEntryRequest: {
				type: "object",
				required: ["signature", "nonce"],
				properties: {
					signature: { $ref: "#/components/schemas/Hex" },
					nonce: { type: "integer", minimum: 0 },
				},
			},
			PendingAuthor: {
				type: "object",
				required: ["transactionId", "author"],
				properties: {
					transactionId: { type: "string" },
					author: { $ref: "#/components/schemas/Address" },
				},
			},
			PendingSigner: {
				type: "object",
				required: ["transactionId", "signer"],
				properties: {
					transactionId: { type: "string" },
					signer: { $ref: "#/components/schemas/Address" },
				},
			},
		},
	},
} as const;

export async function GET() {
	return Response.json(openApiDocument, {
		headers: {
			"cache-control": "public, max-age=300, stale-while-revalidate=3600",
		},
	});
}
