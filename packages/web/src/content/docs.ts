export type DocParam = {
	name: string;
	type: string;
	description: string;
};

export type ApiEndpointDoc = {
	method: "GET" | "POST" | "DELETE";
	path: string;
	description: string;
	auth?: string;
	params?: DocParam[];
	body?: DocParam[];
	response?: string;
};

export type ApiSectionDoc = {
	title: string;
	description?: string;
	intro?: string;
	flow?: string;
	endpoints: ApiEndpointDoc[];
};

export const tocItems = [
	{ id: "smart-contracts", label: "Smart Contracts", depth: 0 },
	{ id: "writerfactory", label: "WriterFactory", depth: 1 },
	{ id: "writer", label: "Writer", depth: 1 },
	{ id: "reading", label: "Reading", depth: 2 },
	{ id: "writing", label: "Writing", depth: 2 },
	{ id: "administration", label: "Administration", depth: 2 },
	{ id: "writerstorage", label: "WriterStorage", depth: 1 },
	{ id: "colorregistry", label: "ColorRegistry", depth: 1 },
	{ id: "api", label: "API", depth: 0 },
	{ id: "writers", label: "Writers", depth: 1 },
	{ id: "entries", label: "Entries", depth: 1 },
	{ id: "user", label: "User", depth: 1 },
	{ id: "for-agents", label: "For Agents", depth: 1 },
	{ id: "content-encoding", label: "Content Encoding", depth: 0 },
	{ id: "format-prefixes", label: "Format Prefixes", depth: 1 },
	{ id: "compression", label: "Compression", depth: 1 },
	{ id: "encryption", label: "Encryption", depth: 1 },
	{ id: "decoding", label: "Decoding", depth: 1 },
] as const;

export const apiIntro =
	"Public read endpoints are available to any client. Browser write endpoints are restricted to authenticated frontend clients (Privy bearer token required); programmatic agent writes should use the x402 endpoints documented below.";

export const apiBaseUrl = "https://api.writer.place";

export const apiSections: ApiSectionDoc[] = [
	{
		title: "Writers",
		endpoints: [
			{
				method: "GET",
				path: "/writer/public",
				description: "List all public writers.",
				response: "{ writers: Writer[] }",
			},
			{
				method: "GET",
				path: "/writer/:address",
				description: "Get a specific writer and all its entries.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
				],
				response: "{ writer: Writer }",
			},
			{
				method: "GET",
				path: "https://writer.place/writer/:address.md",
				description:
					"Fetch a Writer Place summary as Markdown, including frontmatter metadata and public entry links. The canonical Place URL also supports content negotiation with Accept: text/markdown.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
				],
				response: "text/markdown; charset=utf-8",
			},
			{
				method: "GET",
				path: "/manager/:address",
				description: "Get all writers managed by an address.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Manager wallet address",
					},
				],
				response: "{ writers: Writer[] }",
			},
		],
	},
	{
		title: "Entries",
		endpoints: [
			{
				method: "GET",
				path: "/writer/:address/entry/:id",
				description: "Get a confirmed entry by its onchain ID.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
					{
						name: "id",
						type: "bigint",
						description: "Onchain entry ID. Entry ID 0 is valid.",
					},
				],
				response: "{ entry: Entry }",
			},
			{
				method: "GET",
				path: "https://writer.place/writer/:address/:id.md",
				description:
					"Fetch a public/plaintext entry as Markdown with provenance frontmatter from the web app. The canonical HTML entry URL also supports content negotiation with Accept: text/markdown. Encrypted entries return 403 because the server does not have wallet-derived decryption keys.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
					{
						name: "id",
						type: "bigint",
						description: "Onchain entry ID, including 0",
					},
				],
				response: "text/markdown; charset=utf-8",
			},
			{
				method: "GET",
				path: "/writer/:address/entry/pending/:id",
				description: "Get a pending entry before onchain confirmation.",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
					{
						name: "id",
						type: "string",
						description: "Database entry ID",
					},
				],
				response: "{ entry: Entry }",
			},
		],
	},
	{
		title: "User",
		endpoints: [
			{
				method: "GET",
				path: "/me/:address",
				description: "Get user data for an address.",
				params: [
					{
						name: "address",
						type: "address",
						description: "User wallet address",
					},
				],
				response: "{ user: User }",
			},
		],
	},
	{
		title: "For Agents",
		description:
			"Agent-oriented write endpoints use x402 payments instead of Privy browser auth. See /agents.md for operational guidance and safety policy.",
		intro:
			"x402 endpoints return a payment challenge when payment is required. The x402 payer must match the action signer: for Place creation the payer must equal the requested admin address; for entry creates, updates, and deletes the payer must equal the recovered EIP-712 signer.",
		flow:
			"agent prepares request → x402 payment → EIP-712 signature where needed → relay transaction → pending response → indexer confirmation",
		endpoints: [
			{
				method: "POST",
				path: "/x402/factory/create",
				description:
					"Create a new Writer Place. The x402 payer becomes the admin and sole manager.",
				auth: "x402 payment; payer must equal address",
				body: [
					{
						name: "address",
						type: "address",
						description: "Admin wallet address; must match the x402 payer",
					},
					{
						name: "title",
						type: "string",
						description: "Place title. Defaults to Untitled Place",
					},
				],
				response:
					"{ writer: Writer & { transactionId: string, createdAtHash: null } }",
			},
			{
				method: "POST",
				path: "/x402/writer/:address/entry/createWithChunk",
				description:
					"Create an entry in a Writer Place using an EIP-712 CreateWithChunk signature. The content is the final encoded content string, not necessarily raw markdown.",
				auth: "x402 payment; payer must equal recovered entry author",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
				],
				body: [
					{
						name: "signature",
						type: "bytes",
						description: "EIP-712 CreateWithChunk signature",
					},
					{
						name: "nonce",
						type: "uint256",
						description: "Unique nonce for replay protection",
					},
					{
						name: "chunkCount",
						type: "uint256",
						description: "Total number of chunks; currently 1 in the CLI flow",
					},
					{
						name: "chunkContent",
						type: "string",
						description: "Encoded entry content; see Content Encoding",
					},
				],
				response: "{ pending: { transactionId: string, author: address } }",
			},
			{
				method: "POST",
				path: "/x402/writer/:address/entry/:id/update",
				description:
					"Update an entry using an EIP-712 Update signature. The content is the full replacement encoded content string.",
				auth: "x402 payment; payer must equal recovered entry author",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
					{
						name: "id",
						type: "bigint",
						description: "Onchain entry ID. Entry ID 0 is valid.",
					},
				],
				body: [
					{
						name: "signature",
						type: "bytes",
						description: "EIP-712 Update signature",
					},
					{
						name: "nonce",
						type: "uint256",
						description: "Unique nonce for replay protection",
					},
					{
						name: "totalChunks",
						type: "uint256",
						description: "Total number of chunks; currently 1 in the CLI flow",
					},
					{
						name: "content",
						type: "string",
						description: "Replacement encoded entry content; see Content Encoding",
					},
				],
				response: "{ pending: { transactionId: string, author: address } }",
			},
			{
				method: "POST",
				path: "/x402/writer/:address/entry/:id/delete",
				description:
					"Delete an entry using an EIP-712 Remove signature. Deletion updates Writer state; it does not erase historical blockchain data.",
				auth: "x402 payment; payer must equal recovered remover/signing author",
				params: [
					{
						name: "address",
						type: "address",
						description: "Writer contract address",
					},
					{
						name: "id",
						type: "bigint",
						description: "Onchain entry ID. Entry ID 0 is valid.",
					},
				],
				body: [
					{
						name: "signature",
						type: "bytes",
						description: "EIP-712 Remove signature over nonce and id",
					},
					{
						name: "nonce",
						type: "uint256",
						description: "Unique nonce for replay protection",
					},
				],
				response: "{ pending: { transactionId: string, signer: address } }",
			},
		],
	},
];

function paramTable(params: DocParam[]) {
	return [
		"| Parameter | Type | Description |",
		"|-----------|------|-------------|",
		...params.map((p) => `| \`${p.name}\` | \`${p.type}\` | ${p.description} |`),
	].join("\n");
}

function endpointMarkdown(endpoint: ApiEndpointDoc) {
	const lines = [`#### \`${endpoint.method} ${endpoint.path}\``, "", endpoint.description, ""];
	if (endpoint.auth) {
		lines.push(`**Auth:** ${endpoint.auth}`, "");
	}
	if (endpoint.params?.length) {
		lines.push(paramTable(endpoint.params), "");
	}
	if (endpoint.body?.length) {
		lines.push("**Body:**", "", paramTable(endpoint.body), "");
	}
	if (endpoint.response) {
		lines.push(`**Response:** \`${endpoint.response}\``, "");
	}
	return lines.join("\n");
}

function apiMarkdown() {
	const lines = ["## API", "", apiIntro, "", `Base URL: \`${apiBaseUrl}\``, ""];
	for (const section of apiSections) {
		lines.push(`### ${section.title}`, "");
		if (section.description) {
			lines.push(section.description, "");
		}
		if (section.intro) {
			lines.push(section.intro, "");
		}
		if (section.flow) {
			lines.push("```text", section.flow, "```", "");
		}
		for (const endpoint of section.endpoints) {
			lines.push(endpointMarkdown(endpoint));
		}
		lines.push("---", "");
	}
	lines.push(
		"Writer Places can be fetched as Markdown at `https://writer.place/writer/:address.md`, or from the canonical Place URL with `Accept: text/markdown`. Public entries can be fetched as Markdown with provenance frontmatter at `https://writer.place/writer/:address/:id.md`, or from the canonical entry URL with `Accept: text/markdown`. Encrypted entries cannot be returned as Markdown by the server.",
		"",
		"Agent guidance is published at `/agents.md`, `/agents.txt`, and `/llms.txt`. Machine-readable discovery is available at `/.well-known/writer-agent.json`. Current x402 pricing and write capabilities are available at `/.well-known/x402.json` and `https://api.writer.place/x402/capabilities`. The TypeScript SDK in `packages/sdk` exposes `createWriterSdk()` for capability discovery, Markdown reads, x402 payments, EIP-712 signing, Place creation, entry updates, and entry deletion. These docs are also available as Markdown at `/docs.md`, or from `/docs` with `Accept: text/markdown`. Public Place discovery is available at `/explore.md`, or from `/explore` with `Accept: text/markdown`. The OpenAPI 3.1 schema for public reads and x402 writes is available at `/openapi.json`.",
		"",
	);
	return lines.join("\n");
}

const smartContractsMarkdown = `## Smart Contracts

### WriterFactory

Factory contract that deploys Writer + WriterStorage pairs using CREATE2 for deterministic addresses.

#### \`create(title, admin, managers, publicWritable, salt)\` → \`(address, address)\`

Deploy a new Writer and WriterStorage contract pair.

| Parameter | Type | Description |
|-----------|------|-------------|
| \`title\` | \`string\` | Name of the writer/publication |
| \`admin\` | \`address\` | Admin address for the writer |
| \`managers\` | \`address[]\` | Addresses granted the WRITER role |
| \`publicWritable\` | \`bool\` | Whether anyone may write without manager role |
| \`salt\` | \`bytes32\` | Salt for deterministic deployment |

**Returns:** \`(address writerAddress, address storeAddress)\`

**Events:** \`WriterCreated(writerAddress, storeAddress, admin, title, managers, publicWritable)\`

#### \`computeWriterStorageAddress(salt)\` → \`address\` [view]

Pre-compute the address a WriterStorage would be deployed to with the given salt.

#### \`computeWriterAddress(title, admin, managers, publicWritable, salt)\` → \`address\` [view]

Pre-compute the address a Writer would be deployed to with the given parameters.

### Writer

Main logic contract for managing entries with role-based access control. All write operations have signature variants (\`*WithSig\`) that accept EIP-712 typed data signatures for gasless transactions.

#### Reading

- \`getEntryCount()\` → \`uint256\` [view]
- \`getEntryIds()\` → \`uint256[]\` [view]
- \`getEntry(id)\` → \`Entry { createdAtBlock, updatedAtBlock, chunks[], totalChunks, receivedChunks, author }\` [view]
- \`getEntryContent(id)\` → \`string\` [view]
- \`getEntryChunk(id, index)\` → \`string\` [view]

#### Writing

- \`createWithChunk(chunkCount, content)\` creates a new entry. Access: WRITER_ROLE.
- \`createWithChunkWithSig(signature, nonce, chunkCount, content)\` creates via EIP-712 signature. Signer must have WRITER_ROLE.
- \`addChunk(id, index, content)\` adds a content chunk. Access: author + WRITER_ROLE.
- \`addChunkWithSig(signature, nonce, id, index, content)\` adds a chunk via EIP-712 signature.
- \`update(id, totalChunks, content)\` replaces an entry's content. Access: author + WRITER_ROLE.
- \`updateWithSig(signature, nonce, id, totalChunks, content)\` replaces via EIP-712 signature.
- \`remove(id)\` deletes an entry. Access: author + WRITER_ROLE.
- \`removeWithSig(signature, nonce, id)\` deletes via EIP-712 signature.

#### Administration

- \`setTitle(newTitle)\` updates the writer title. Access: DEFAULT_ADMIN_ROLE.
- \`setTitleWithSig(signature, nonce, newTitle)\` updates title via EIP-712 signature.
- \`replaceAdmin(newAdmin)\` transfers admin role to a new address.

### WriterStorage

Storage contract that holds all entry data. Only the Writer logic contract can modify state.

\`\`\`solidity
struct Entry {
    uint256 createdAtBlock;
    uint256 updatedAtBlock;
    string[] chunks;
    uint256 totalChunks;
    uint256 receivedChunks;
    address author;
}
\`\`\`

### ColorRegistry

Simple registry mapping user addresses to their chosen hex color.

- \`setHex(hexColor)\`
- \`setHexWithSig(signature, nonce, hexColor)\`
- \`getPrimary(user)\` → \`bytes32\` [view]
`;

const contentEncodingMarkdown = `## Content Encoding

Entry content stored onchain goes through a multi-step encoding pipeline before being passed to the API. The \`content\` / \`chunkContent\` fields in create and update requests contain the final encoded string — not raw markdown.

### Pipeline

\`\`\`text
Markdown → Compress (Brotli) → Encrypt (optional) → Prefix → Store
\`\`\`

1. **Write** — Author composes content in markdown
2. **Compress** — Content is Brotli-compressed (quality 11) and Base64-encoded
3. **Encrypt** (private entries only) — Compressed content is encrypted with AES-GCM and Base64-encoded
4. **Prefix** — A version prefix is prepended to indicate the encoding format
5. **Store** — The prefixed string is signed (EIP-712) and stored onchain as the entry content

### Format Prefixes

| Prefix | Encryption | Compression | Description |
|--------|------------|-------------|-------------|
| \`br:\` | None | Brotli | Public entry, compressed only |
| \`enc:v5:br:\` | AES-256-GCM (v5 per-writer key) | Brotli | Private entry, current format |
| \`enc:v4:br:\` | AES-256-GCM (v4 per-writer key) | Brotli | Deprecated |
| \`enc:v3:br:\` | AES-GCM (v3 key) | Brotli | Deprecated |
| \`enc:v2:br:\` | AES-GCM (v2 key) | Brotli | Deprecated |
| \`enc:br:\` | AES-GCM (v1 key) | Brotli | Deprecated |

### Compression

All content is compressed with Brotli at quality level 11, then Base64-encoded.

\`\`\`text
markdown → UTF-8 encode → brotli compress → base64 encode
\`\`\`

### Encryption

Private entries are encrypted **after** compression using AES-GCM. Current v5 entries use an AES-256-GCM key derived per writer/place, with a 12-byte random IV.

\`\`\`text
compressed content → AES-GCM encrypt → prepend IV → Base64 encode
\`\`\`

The current v5 encryption key is deterministically derived from a wallet EIP-712 signature scoped to writer.place and the WriterStorage address, then expanded with HKDF-SHA256. The key never leaves the client.

### Decoding

| Prefix | Steps |
|--------|-------|
| \`br:\` | Strip prefix → Base64 decode → Brotli decompress |
| \`enc:v5:br:\` | Strip prefix → Base64 decode → AES-GCM decrypt (v5 key) → Brotli decompress |
| \`enc:v4:br:\` | Strip prefix → Base64 decode → AES-GCM decrypt (v4 key) → Brotli decompress |
| \`enc:v3:br:\` | Strip prefix → Base64 decode → AES-GCM decrypt (v3 key) → Brotli decompress |
| \`enc:v2:br:\` | Strip prefix → Base64 decode → AES-GCM decrypt (v2 key) → Brotli decompress |
| \`enc:br:\` | Strip prefix → Base64 decode → AES-GCM decrypt (v1 key) → Brotli decompress |

Public entries are decoded server-side and returned as plaintext in the \`decompressed\` field. Private entries are returned as raw encoded strings and decrypted client-side using the author's wallet.
`;

export function renderDocsMarkdown() {
	return [
		"# Writer Documentation",
		"",
		"Writer is an onchain writing platform. Content is permanently stored on Optimism through smart contracts, with all writes authenticated via EIP-712 signatures.",
		"",
		smartContractsMarkdown.trim(),
		"",
		apiMarkdown().trim(),
		"",
		contentEncodingMarkdown.trim(),
		"",
	].join("\n");
}
