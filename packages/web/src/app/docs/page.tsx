"use client";

import { useEffect } from "react";

const secondaryGray = "dark:text-neutral-200 text-neutral-800";

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function copyAnchor(id: string) {
	const url = `${window.location.origin}${window.location.pathname}#${id}`;
	navigator.clipboard.writeText(url);
	window.history.replaceState(null, "", `#${id}`);
	document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function AnchorHeading({
	id,
	className,
	as: Tag = "h2",
	children,
}: {
	id: string;
	className?: string;
	as?: "h2" | "h3" | "code";
	children: React.ReactNode;
}) {
	return (
		<Tag
			id={id}
			className={`${className ?? ""} cursor-pointer scroll-mt-24 group inline-flex items-center`}
			onClick={() => copyAnchor(id)}
		>
			{children}
			<span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal ml-2 text-sm text-neutral-400 dark:text-neutral-500">&sect;</span>
		</Tag>
	);
}

function Section({
	title,
	children,
}: { title: string; children: React.ReactNode }) {
	const id = slugify(title);
	return (
		<section className="mb-16">
			<AnchorHeading id={id} className="text-3xl font-serif mb-8 text-primary">
				{title}
			</AnchorHeading>
			{children}
		</section>
	);
}

function Endpoint({
	method,
	path,
	description,
	auth,
	params,
	body,
	response,
}: {
	method: "GET" | "POST" | "DELETE";
	path: string;
	description: string;
	auth?: string;
	params?: { name: string; type: string; description: string }[];
	body?: { name: string; type: string; description: string }[];
	response?: string;
}) {
	const methodColor = {
		GET: "text-green-600 dark:text-green-400",
		POST: "text-blue-600 dark:text-blue-400",
		DELETE: "text-red-600 dark:text-red-400",
	}[method];

	const id = slugify(`${method}-${path}`);
	return (
		<div id={id} className="mb-8 border-b border-neutral-200 dark:border-neutral-700 pb-8 last:border-b-0 scroll-mt-24">
			<div
				className="flex items-baseline gap-3 mb-2 cursor-pointer group"
				onClick={() => copyAnchor(id)}
			>
				<span className={`font-mono  font-bold ${methodColor}`}>{method}</span>
				<code className="font-mono ">{path}</code>
				<span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal ml-2 text-sm text-neutral-400 dark:text-neutral-500">&sect;</span>
			</div>
			<p className={`${secondaryGray} mb-3`}>{description}</p>
			{auth && <p className={`${secondaryGray} mb-3`}>Auth: {auth}</p>}
			{params && params.length > 0 && (
				<div className="mb-3">
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1 italic`}
					>
						Parameters
					</p>
					<div className="space-y-1">
						{params.map((p) => (
							<div key={p.name} className=" font-mono">
								<span className="text-primary">{p.name}</span>
								<span className={`${secondaryGray}`}> : {p.type}</span>
								<span className={`${secondaryGray} font-serif font-normal`}>
									{" "}
									— {p.description}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
			{body && body.length > 0 && (
				<div className="mb-3">
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1 italic`}
					>
						Request Body
					</p>
					<div className="space-y-1">
						{body.map((b) => (
							<div key={b.name} className=" font-mono">
								<span className="text-primary">{b.name}</span>
								<span className={`${secondaryGray}`}> : {b.type}</span>
								<span className={`${secondaryGray} font-serif font-normal`}>
									{" "}
									— {b.description}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
			{response && (
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1`}
					>
						Response
					</p>
					<code className={`font-mono ${secondaryGray}`}>{response}</code>
				</div>
			)}
		</div>
	);
}

function ContractFunction({
	name,
	description,
	params,
	returns,
	access,
	events,
}: {
	name: string;
	description: string;
	params?: { name: string; type: string; description: string }[];
	returns?: string;
	access?: string;
	events?: string[];
}) {
	const id = slugify(name);
	return (
		<div id={id} className="mb-8 border-b border-neutral-200 dark:border-neutral-700 pb-8 last:border-b-0 scroll-mt-24">
			<AnchorHeading id={id} as="code" className="font-mono font-bold">
				{name}
			</AnchorHeading>
			<p className={`${secondaryGray}  mt-1 mb-3`}>{description}</p>
			{access && <p className={`${secondaryGray} mb-3`}>Access: {access}</p>}
			{params && params.length > 0 && (
				<div className="mb-3">
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1 italic`}
					>
						Parameters
					</p>
					<div className="space-y-1">
						{params.map((p) => (
							<div key={p.name} className=" font-mono">
								<span className="text-primary">{p.name}</span>
								<span className={`${secondaryGray}`}> : {p.type}</span>
								<span className={`${secondaryGray} font-serif font-normal`}>
									{" "}
									— {p.description}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
			{returns && (
				<div className="mb-3">
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1 italic`}
					>
						Returns
					</p>
					<code className={`font-mono ${secondaryGray}`}>{returns}</code>
				</div>
			)}
			{events && events.length > 0 && (
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide mb-1 italic`}
					>
						Events
					</p>
					<div className="space-y-1">
						{events.map((e) => (
							<code key={e} className={`block font-mono ${secondaryGray}`}>
								{e}
							</code>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default function DocsPage() {
	useEffect(() => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			const el = document.getElementById(hash);
			if (el) {
				setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
			}
		}
	}, []);

	return (
		<div className="max-w-3xl mx-auto py-8">
			<p className={`${secondaryGray} mb-16 `}>
				Writer is an onchain writing platform. Content is permanently stored on
				Optimism through smart contracts, with all writes authenticated via
				EIP-712 signatures.
			</p>

			{/* SMART CONTRACTS */}
			<div className="mb-24">
				<AnchorHeading id="smart-contracts" className="text-xl font-serif italic text-primary mb-12">
					Smart Contracts
				</AnchorHeading>

				<Section title="WriterFactory">
					<p className={`${secondaryGray}  mb-8`}>
						Factory contract that deploys Writer + WriterStorage pairs using
						CREATE2 for deterministic addresses.
					</p>

					<ContractFunction
						name="create(title, admin, managers, salt)"
						description="Deploy a new Writer and WriterStorage contract pair."
						params={[
							{
								name: "title",
								type: "string",
								description: "Name of the writer/publication",
							},
							{
								name: "admin",
								type: "address",
								description: "Admin address for the writer",
							},
							{
								name: "managers",
								type: "address[]",
								description: "Addresses granted the WRITER role",
							},
							{
								name: "salt",
								type: "bytes32",
								description: "Salt for deterministic deployment",
							},
						]}
						returns="(address writerAddress, address storeAddress)"
						events={[
							"WriterCreated(writerAddress, storeAddress, admin, title, managers)",
						]}
					/>

					<ContractFunction
						name="computeWriterStorageAddress(salt)"
						description="Pre-compute the address a WriterStorage would be deployed to with the given salt."
						params={[
							{ name: "salt", type: "bytes32", description: "Deployment salt" },
						]}
						returns="address"
						access="View"
					/>

					<ContractFunction
						name="computeWriterAddress(title, admin, managers, salt)"
						description="Pre-compute the address a Writer would be deployed to with the given parameters."
						params={[
							{ name: "title", type: "string", description: "Writer title" },
							{ name: "admin", type: "address", description: "Admin address" },
							{
								name: "managers",
								type: "address[]",
								description: "Manager addresses",
							},
							{ name: "salt", type: "bytes32", description: "Deployment salt" },
						]}
						returns="address"
						access="View"
					/>
				</Section>

				<Section title="Writer">
					<p className={`${secondaryGray}  mb-8`}>
						Main logic contract for managing entries with role-based access
						control. All write operations have signature variants (*WithSig)
						that accept EIP-712 typed data signatures for gasless transactions.
					</p>

					<AnchorHeading id="reading" as="h3" className={`text-lg font-serif mb-6 ${secondaryGray}`}>
						Reading
					</AnchorHeading>

					<ContractFunction
						name="getEntryCount()"
						description="Returns the total number of entries."
						returns="uint256"
						access="View"
					/>

					<ContractFunction
						name="getEntryIds()"
						description="Returns an array of all entry IDs."
						returns="uint256[]"
						access="View"
					/>

					<ContractFunction
						name="getEntry(id)"
						description="Returns the full entry struct including chunks, author, and timestamps."
						params={[{ name: "id", type: "uint256", description: "Entry ID" }]}
						returns="Entry { createdAtBlock, updatedAtBlock, chunks[], totalChunks, receivedChunks, author }"
						access="View"
					/>

					<ContractFunction
						name="getEntryContent(id)"
						description="Returns the concatenated content of all chunks for an entry."
						params={[{ name: "id", type: "uint256", description: "Entry ID" }]}
						returns="string"
						access="View"
					/>

					<ContractFunction
						name="getEntryChunk(id, index)"
						description="Returns a specific chunk's content."
						params={[
							{ name: "id", type: "uint256", description: "Entry ID" },
							{ name: "index", type: "uint256", description: "Chunk index" },
						]}
						returns="string"
						access="View"
					/>

					<AnchorHeading id="writing" as="h3" className={`text-lg font-serif mb-6 mt-12 ${secondaryGray}`}>
						Writing
					</AnchorHeading>

					<ContractFunction
						name="createWithChunk(chunkCount, content)"
						description="Create a new entry with the first chunk of content. Caller becomes the entry author."
						params={[
							{
								name: "chunkCount",
								type: "uint256",
								description: "Total number of chunks for this entry",
							},
							{
								name: "content",
								type: "string",
								description: "First chunk content",
							},
						]}
						returns="(uint256 entryId, Entry entry)"
						access="WRITER_ROLE"
						events={[
							"EntryCreated(id, author)",
							"ChunkReceived(author, id, index, content)",
						]}
					/>

					<ContractFunction
						name="createWithChunkWithSig(signature, nonce, chunkCount, content)"
						description="Create a new entry with the first chunk via EIP-712 signature. Signer becomes the entry author."
						params={[
							{ name: "signature", type: "bytes", description: "EIP-712 typed data signature" },
							{ name: "nonce", type: "uint256", description: "Unique nonce for replay protection" },
							{ name: "chunkCount", type: "uint256", description: "Total number of chunks" },
							{ name: "content", type: "string", description: "First chunk content" },
						]}
						returns="(uint256 entryId, Entry entry)"
						access="Signer must have WRITER_ROLE"
						events={[
							"EntryCreated(id, author)",
							"ChunkReceived(author, id, index, content)",
						]}
					/>

					<ContractFunction
						name="addChunk(id, index, content)"
						description="Add a chunk to an existing entry at a specific index."
						params={[
							{ name: "id", type: "uint256", description: "Entry ID" },
							{ name: "index", type: "uint256", description: "Chunk index" },
							{ name: "content", type: "string", description: "Chunk content" },
						]}
						returns="Entry"
						access="Author + WRITER_ROLE"
						events={["ChunkReceived(author, id, index, content)"]}
					/>

					<ContractFunction
						name="addChunkWithSig(signature, nonce, id, index, content)"
						description="Add a chunk to an existing entry via EIP-712 signature."
						params={[
							{ name: "signature", type: "bytes", description: "EIP-712 typed data signature" },
							{ name: "nonce", type: "uint256", description: "Unique nonce for replay protection" },
							{ name: "id", type: "uint256", description: "Entry ID" },
							{ name: "index", type: "uint256", description: "Chunk index" },
							{ name: "content", type: "string", description: "Chunk content" },
						]}
						returns="Entry"
						access="Signer must be author + WRITER_ROLE"
						events={["ChunkReceived(author, id, index, content)"]}
					/>

					<ContractFunction
						name="update(id, totalChunks, content)"
						description="Replace an entry's content. Clears all previous chunks and sets new content."
						params={[
							{ name: "id", type: "uint256", description: "Entry ID" },
							{
								name: "totalChunks",
								type: "uint256",
								description: "New total chunks",
							},
							{
								name: "content",
								type: "string",
								description: "New first chunk content",
							},
						]}
						returns="Entry"
						access="Author + WRITER_ROLE"
						events={[
							"EntryUpdated(id, author)",
							"ChunkReceived(author, id, index, content)",
						]}
					/>

					<ContractFunction
						name="updateWithSig(signature, nonce, id, totalChunks, content)"
						description="Replace an entry's content via EIP-712 signature."
						params={[
							{ name: "signature", type: "bytes", description: "EIP-712 typed data signature" },
							{ name: "nonce", type: "uint256", description: "Unique nonce for replay protection" },
							{ name: "id", type: "uint256", description: "Entry ID" },
							{ name: "totalChunks", type: "uint256", description: "New total chunks" },
							{ name: "content", type: "string", description: "New first chunk content" },
						]}
						access="Signer must be author + WRITER_ROLE"
						events={[
							"EntryUpdated(id, author)",
							"ChunkReceived(author, id, index, content)",
						]}
					/>

					<ContractFunction
						name="remove(id)"
						description="Delete an entry."
						params={[{ name: "id", type: "uint256", description: "Entry ID" }]}
						access="Author + WRITER_ROLE"
						events={["EntryRemoved(id, author)"]}
					/>

					<ContractFunction
						name="removeWithSig(signature, nonce, id)"
						description="Delete an entry via EIP-712 signature."
						params={[
							{ name: "signature", type: "bytes", description: "EIP-712 typed data signature" },
							{ name: "nonce", type: "uint256", description: "Unique nonce for replay protection" },
							{ name: "id", type: "uint256", description: "Entry ID" },
						]}
						access="Signer must be author + WRITER_ROLE"
						events={["EntryRemoved(id, author)"]}
					/>

					<AnchorHeading id="administration" as="h3" className={`text-lg font-serif mb-6 mt-12 ${secondaryGray}`}>
						Administration
					</AnchorHeading>

					<ContractFunction
						name="setTitle(newTitle)"
						description="Update the writer's title."
						params={[
							{ name: "newTitle", type: "string", description: "New title" },
						]}
						access="DEFAULT_ADMIN_ROLE"
						events={["TitleSet(title)"]}
					/>

					<ContractFunction
						name="setTitleWithSig(signature, nonce, newTitle)"
						description="Update the writer's title via EIP-712 signature."
						params={[
							{ name: "signature", type: "bytes", description: "EIP-712 typed data signature" },
							{ name: "nonce", type: "uint256", description: "Unique nonce for replay protection" },
							{ name: "newTitle", type: "string", description: "New title" },
						]}
						access="Signer must have DEFAULT_ADMIN_ROLE"
						events={["TitleSet(title)"]}
					/>

					<ContractFunction
						name="replaceAdmin(newAdmin)"
						description="Transfer admin role to a new address. Revokes admin from the caller."
						params={[
							{
								name: "newAdmin",
								type: "address",
								description: "New admin address",
							},
						]}
						access="DEFAULT_ADMIN_ROLE"
					/>
				</Section>

				<Section title="WriterStorage">
					<p className={`${secondaryGray}  mb-8`}>
						Storage contract that holds all entry data. Only the Writer logic
						contract can modify state, enforced by the onlyLogic modifier.
					</p>

					<ContractFunction
						name="Entry struct"
						description="The data structure for each entry stored onchain."
						params={[
							{
								name: "createdAtBlock",
								type: "uint256",
								description: "Block number when entry was created",
							},
							{
								name: "updatedAtBlock",
								type: "uint256",
								description: "Block number of last update",
							},
							{
								name: "chunks",
								type: "string[]",
								description: "Array of content chunks",
							},
							{
								name: "totalChunks",
								type: "uint256",
								description: "Expected total number of chunks",
							},
							{
								name: "receivedChunks",
								type: "uint256",
								description: "Number of chunks received so far",
							},
							{
								name: "author",
								type: "address",
								description: "Address of the entry author",
							},
						]}
					/>
				</Section>

				<Section title="ColorRegistry">
					<p className={`${secondaryGray}  mb-8`}>
						Simple registry mapping user addresses to their chosen hex color.
						Supports both direct calls and EIP-712 signature-based updates.
					</p>

					<ContractFunction
						name="setHex(hexColor)"
						description="Set your color directly."
						params={[
							{
								name: "hexColor",
								type: "bytes32",
								description: "Color in bytes32 format",
							},
						]}
						events={["HexSet(user, hexColor)"]}
					/>

					<ContractFunction
						name="setHexWithSig(signature, nonce, hexColor)"
						description="Set your color via EIP-712 signature."
						params={[
							{
								name: "signature",
								type: "bytes",
								description: "EIP-712 signature",
							},
							{
								name: "nonce",
								type: "uint256",
								description: "Unique nonce for replay protection",
							},
							{
								name: "hexColor",
								type: "bytes32",
								description: "Color in bytes32 format",
							},
						]}
						events={["HexSet(user, hexColor)"]}
					/>

					<ContractFunction
						name="getPrimary(user)"
						description="Get a user's hex color."
						params={[
							{ name: "user", type: "address", description: "User address" },
						]}
						returns="bytes32"
						access="View"
					/>
				</Section>
			</div>

			{/* API */}
			<div className="mb-24">
				<AnchorHeading id="api" className="text-xl font-serif italic text-primary mb-12">API</AnchorHeading>
				<p className={`${secondaryGray}  mb-12`}>
					All write operations are authenticated via EIP-712 signatures — the
					server recovers the signer address from the signature and validates
					permissions. Transactions are relayed to Optimism via Syndicate.
				</p>

				<Section title="Writers">
					<Endpoint
						method="GET"
						path="/writer/public"
						description="List all public writers."
						response="{ writers: Writer[] }"
					/>

					<Endpoint
						method="GET"
						path="/writer/:address"
						description="Get a specific writer and all its entries."
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
						]}
						response="{ writer: Writer }"
					/>

					<Endpoint
						method="GET"
						path="/manager/:address"
						description="Get all writers managed by an address."
						params={[
							{
								name: "address",
								type: "address",
								description: "Manager wallet address",
							},
						]}
						response="{ writers: Writer[] }"
					/>

					<Endpoint
						method="POST"
						path="/factory/create"
						description="Deploy a new Writer + WriterStorage contract pair."
						body={[
							{ name: "title", type: "string", description: "Writer title" },
							{ name: "admin", type: "address", description: "Admin address" },
							{
								name: "managers",
								type: "address[]",
								description: "Manager addresses",
							},
							{
								name: "isPrivate",
								type: "boolean?",
								description: "Whether the writer is private",
							},
						]}
						response="{ writer: Writer }"
					/>

				</Section>

				<Section title="Entries">
					<Endpoint
						method="GET"
						path="/writer/:address/entry/:id"
						description="Get a confirmed entry by its onchain ID."
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
							{ name: "id", type: "bigint", description: "Onchain entry ID" },
						]}
						response="{ entry: Entry }"
					/>

					<Endpoint
						method="GET"
						path="/writer/:address/entry/pending/:id"
						description="Get a pending entry before onchain confirmation."
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
							{ name: "id", type: "string", description: "Database entry ID" },
						]}
						response="{ entry: Entry }"
					/>

					<Endpoint
						method="POST"
						path="/writer/:address/entry/createWithChunk"
						description="Create a new entry with the first chunk of content."
						auth="EIP-712 signature (signer must have WRITER_ROLE)"
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
						]}
						body={[
							{
								name: "signature",
								type: "string",
								description: "EIP-712 typed data signature",
							},
							{ name: "nonce", type: "bigint", description: "Unique nonce" },
							{
								name: "chunkCount",
								type: "bigint",
								description: "Total chunks for this entry",
							},
							{
								name: "chunkContent",
								type: "string",
								description: "First chunk content",
							},
						]}
						response="{ entry: Entry }"
					/>

					<Endpoint
						method="POST"
						path="/writer/:address/entry/:id/update"
						description="Update an existing entry's content."
						auth="EIP-712 signature (signer must be entry author)"
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
							{ name: "id", type: "string", description: "Entry ID" },
						]}
						body={[
							{
								name: "signature",
								type: "string",
								description: "EIP-712 typed data signature",
							},
							{ name: "nonce", type: "bigint", description: "Unique nonce" },
							{
								name: "totalChunks",
								type: "bigint",
								description: "New total chunks",
							},
							{ name: "content", type: "string", description: "New content" },
						]}
						response="{ entry: Entry }"
					/>

					<Endpoint
						method="POST"
						path="/writer/:address/entry/:id/delete"
						description="Delete an entry."
						auth="EIP-712 signature (signer must be entry author)"
						params={[
							{
								name: "address",
								type: "address",
								description: "Writer contract address",
							},
							{ name: "id", type: "string", description: "Entry ID" },
						]}
						body={[
							{
								name: "signature",
								type: "string",
								description: "EIP-712 typed data signature",
							},
							{ name: "nonce", type: "bigint", description: "Unique nonce" },
						]}
						response="{ writer: Writer }"
					/>
				</Section>

				<Section title="Color">
					<Endpoint
						method="POST"
						path="/color-registry/set"
						description="Set your primary color via EIP-712 signature."
						auth="EIP-712 signature"
						body={[
							{
								name: "signature",
								type: "string",
								description: "EIP-712 typed data signature",
							},
							{ name: "nonce", type: "bigint", description: "Unique nonce" },
							{
								name: "hexColor",
								type: "bytes32",
								description:
									"Color in bytes32 format (0x-prefixed, 64 hex chars)",
							},
						]}
						response="{ user: User }"
					/>
				</Section>

				<Section title="User">
					<Endpoint
						method="GET"
						path="/me/:address"
						description="Get user data for an address."
						params={[
							{
								name: "address",
								type: "address",
								description: "User wallet address",
							},
						]}
						response="{ user: User }"
					/>
				</Section>
			</div>
		</div>
	);
}
