"use client";

import { Check } from "@/components/icons/Check";
import { Copy } from "@/components/icons/Copy";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_CONTENT_LENGTH, MAX_TITLE_LENGTH } from "utils/constants";

const secondaryGray = "dark:text-neutral-200 text-neutral-800";

const humanLogos = Array.from({ length: 32 }, (_, i) => `logo-${i + 1}.png`);

function getLogoForSection(title: string) {
	let hash = 0;
	for (let i = 0; i < title.length; i++) {
		hash = (hash * 31 + title.charCodeAt(i)) | 0;
	}
	return humanLogos[Math.abs(hash) % humanLogos.length];
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			aria-label="Copy"
			className="text-neutral-500 hover:text-primary transition-colors align-middle"
		>
			{copied ? (
				<Check className="text-primary" />
			) : (
				<Copy className="cursor-pointer" />
			)}
		</button>
	);
}

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
			className={`${
				className ?? ""
			} cursor-pointer scroll-mt-24 group inline-flex items-center`}
			onClick={() => copyAnchor(id)}
		>
			{children}
			<span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal ml-2 text-sm text-primary">
				&sect;
			</span>
		</Tag>
	);
}

function RelicDivider({ seed }: { seed: string }) {
	const logo = getLogoForSection(seed);
	return (
		<div className="flex justify-center my-12">
			<Image
				src={`/images/human/${logo}`}
				alt=""
				width={50}
				height={50}
				className="object-contain dark:invert"
				priority
			/>
		</div>
	);
}

function Section({
	title,
	children,
	description,
}: { title: string; children: React.ReactNode; description?: string }) {
	const id = slugify(title);
	return (
		<section className="bg-surface p-2">
			<AnchorHeading id={id} className="text-3xl font-serif text-primary">
				{title}
			</AnchorHeading>
			{description && <p className={`${secondaryGray}`}>{description}</p>}
			<div className="mt-4">{children}</div>
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
		<div
			id={id}
			className="border-b last:mb-0 last:pb-0 mb-6 pb-6 border-neutral-300 dark:border-neutral-700 last:border-b-0 scroll-mt-24 flex flex-col gap-6"
		>
			<div>
				<div
					className="flex items-baseline gap-3 mb-2 cursor-pointer group"
					onClick={() => copyAnchor(id)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							copyAnchor(id);
						}
					}}
					role="button"
					tabIndex={0}
					aria-label="Copy anchor"
				>
					<span className={`font-mono  font-bold ${methodColor}`}>
						{method}
					</span>
					<code className="font-mono">{path}</code>
					<span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal ml-2 text-sm text-neutral-500 dark:text-neutral-400">
						&sect;
					</span>
				</div>
				<p className={`${secondaryGray}`}>{description}</p>
				{auth && <p className={`${secondaryGray}`}>Auth: {auth}</p>}
			</div>
			{params && params.length > 0 && (
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide italic`}
					>
						Parameters
					</p>
					<div>
						{params.map((p) => (
							<div key={p.name}>
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
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide italic`}
					>
						Request Body
					</p>
					<div>
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
					<p className={`font-bold ${secondaryGray} uppercase tracking-wide`}>
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
		<div
			id={id}
			className="border-b last:mb-0 last:pb-0 mb-6 pb-6 border-neutral-300 dark:border-neutral-700 last:border-b-0 scroll-mt-24 flex flex-col gap-6"
		>
			<div>
				<AnchorHeading id={id} as="code" className="font-mono font-bold">
					{name}
				</AnchorHeading>
				<p className={`${secondaryGray}`}>{description}</p>
				{access && <p className={`${secondaryGray}`}>Access: {access}</p>}
			</div>
			{params && params.length > 0 && (
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide italic`}
					>
						Parameters
					</p>
					<div>
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
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide italic`}
					>
						Returns
					</p>
					<code className={`font-mono ${secondaryGray}`}>{returns}</code>
				</div>
			)}
			{events && events.length > 0 && (
				<div>
					<p
						className={`font-bold ${secondaryGray} uppercase tracking-wide italic`}
					>
						Events
					</p>
					<div>
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

const tocItems = [
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
	{ id: "color", label: "Color", depth: 1 },
	{ id: "user", label: "User", depth: 1 },
	{ id: "content-encoding", label: "Content Encoding", depth: 0 },
	{ id: "format-prefixes", label: "Format Prefixes", depth: 1 },
	{ id: "compression", label: "Compression", depth: 1 },
	{ id: "encryption", label: "Encryption", depth: 1 },
	{ id: "decoding", label: "Decoding", depth: 1 },
];

function TableOfContents() {
	const [activeId, setActiveId] = useState<string>("");
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		const ids = tocItems.map((item) => item.id);
		const elements = ids
			.map((id) => document.getElementById(id))
			.filter(Boolean) as HTMLElement[];

		observerRef.current = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{ rootMargin: "-80px 0px -60% 0px", threshold: 0 },
		);

		for (const el of elements) {
			observerRef.current.observe(el);
		}

		return () => observerRef.current?.disconnect();
	}, []);

	return (
		<nav className="hidden lg:block sticky top-24 self-start w-48 shrink-0">
			<p className="text-sm font-serif italic text-primary mb-4">Contents</p>
			<ul className="space-y-1.5">
				{tocItems.map((item) => (
					<li key={item.id}>
						<a
							href={`#${item.id}`}
							onClick={(e) => {
								e.preventDefault();
								copyAnchor(item.id);
							}}
							className={`block text-sm transition-colors ${
								item.depth === 0
									? "font-serif italic"
									: item.depth === 1
										? "pl-4"
										: "pl-8"
							} ${
								activeId === item.id
									? "text-primary"
									: "text-neutral-400 dark:text-neutral-500 hover:text-primary"
							}`}
						>
							{item.label}
							{activeId === item.id && <span className="ml-1">&sect;</span>}
						</a>
					</li>
				))}
			</ul>
		</nav>
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
		<div className="flex gap-12">
			<div className="max-w-3xl flex-1 min-w-0">
				<p className={`${secondaryGray} mb-4`}>
					Writer is an onchain writing platform. Content is permanently stored
					on Optimism through smart contracts.
				</p>

				{/* SMART CONTRACTS */}
				<div className="mb-24">
					<AnchorHeading
						id="smart-contracts"
						className="text-3xl font-serif italic text-primary mb-1"
					>
						Smart Contracts
					</AnchorHeading>

					<div className="bg-surface p-2">
						<p
							className={`${secondaryGray} flex items-center gap-2 flex-wrap mb-2`}
						>
							<span>WriterFactory:</span>
							<Link
								href="https://optimistic.etherscan.io/address/0x28c7721ECff2246a9277CAd46ab2124f69Efd88E"
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-primary break-all hover:underline"
							>
								0x28c7721ECff2246a9277CAd46ab2124f69Efd88E
							</Link>
							<CopyButton value="0x28c7721ECff2246a9277CAd46ab2124f69Efd88E" />
						</p>
						<p className={`${secondaryGray} flex items-center gap-2 flex-wrap`}>
							<span>ColorRegistry:</span>
							<Link
								href="https://optimistic.etherscan.io/address/0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1"
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-primary break-all hover:underline"
							>
								0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1
							</Link>
							<CopyButton value="0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1" />
						</p>
					</div>
					<RelicDivider seed="smart-contracts" />

					<Section
						title="WriterFactory"
						description="Factory contract that deploys Writer + WriterStorage pairs using CREATE2 for deterministic addresses."
					>
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
								{
									name: "salt",
									type: "bytes32",
									description: "Deployment salt",
								},
							]}
							returns="address"
							access="View"
						/>

						<ContractFunction
							name="computeWriterAddress(title, admin, managers, salt)"
							description="Pre-compute the address a Writer would be deployed to with the given parameters."
							params={[
								{ name: "title", type: "string", description: "Writer title" },
								{
									name: "admin",
									type: "address",
									description: "Admin address",
								},
								{
									name: "managers",
									type: "address[]",
									description: "Manager addresses",
								},
								{
									name: "salt",
									type: "bytes32",
									description: "Deployment salt",
								},
							]}
							returns="address"
							access="View"
						/>
					</Section>
					<RelicDivider seed="factory-writer" />
					<Section
						title="Writer"
						description="Main logic contract for managing entries with role-based access control."
					>
						<AnchorHeading
							id="reading"
							as="h3"
							className={`text-lg font-serif ${secondaryGray}`}
						>
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
							params={[
								{ name: "id", type: "uint256", description: "Entry ID" },
							]}
							returns="Entry { createdAtBlock, updatedAtBlock, chunks[], totalChunks, receivedChunks, author }"
							access="View"
						/>

						<ContractFunction
							name="getEntryContent(id)"
							description="Returns the concatenated content of all chunks for an entry."
							params={[
								{ name: "id", type: "uint256", description: "Entry ID" },
							]}
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

						<AnchorHeading
							id="writing"
							as="h3"
							className={`text-lg font-serif ${secondaryGray}`}
						>
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
								{
									name: "signature",
									type: "bytes",
									description: "EIP-712 typed data signature",
								},
								{
									name: "nonce",
									type: "uint256",
									description: "Unique nonce for replay protection",
								},
								{
									name: "chunkCount",
									type: "uint256",
									description: "Total number of chunks",
								},
								{
									name: "content",
									type: "string",
									description: "First chunk content",
								},
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
								{
									name: "content",
									type: "string",
									description: "Chunk content",
								},
							]}
							returns="Entry"
							access="Author + WRITER_ROLE"
							events={["ChunkReceived(author, id, index, content)"]}
						/>

						<ContractFunction
							name="addChunkWithSig(signature, nonce, id, index, content)"
							description="Add a chunk to an existing entry via EIP-712 signature."
							params={[
								{
									name: "signature",
									type: "bytes",
									description: "EIP-712 typed data signature",
								},
								{
									name: "nonce",
									type: "uint256",
									description: "Unique nonce for replay protection",
								},
								{ name: "id", type: "uint256", description: "Entry ID" },
								{ name: "index", type: "uint256", description: "Chunk index" },
								{
									name: "content",
									type: "string",
									description: "Chunk content",
								},
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
								{
									name: "signature",
									type: "bytes",
									description: "EIP-712 typed data signature",
								},
								{
									name: "nonce",
									type: "uint256",
									description: "Unique nonce for replay protection",
								},
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
							access="Signer must be author + WRITER_ROLE"
							events={[
								"EntryUpdated(id, author)",
								"ChunkReceived(author, id, index, content)",
							]}
						/>

						<ContractFunction
							name="remove(id)"
							description="Delete an entry."
							params={[
								{ name: "id", type: "uint256", description: "Entry ID" },
							]}
							access="Author + WRITER_ROLE"
							events={["EntryRemoved(id, author)"]}
						/>

						<ContractFunction
							name="removeWithSig(signature, nonce, id)"
							description="Delete an entry via EIP-712 signature."
							params={[
								{
									name: "signature",
									type: "bytes",
									description: "EIP-712 typed data signature",
								},
								{
									name: "nonce",
									type: "uint256",
									description: "Unique nonce for replay protection",
								},
								{ name: "id", type: "uint256", description: "Entry ID" },
							]}
							access="Signer must be author + WRITER_ROLE"
							events={["EntryRemoved(id, author)"]}
						/>

						<AnchorHeading
							id="administration"
							as="h3"
							className={`text-lg font-serif ${secondaryGray}`}
						>
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
								{
									name: "signature",
									type: "bytes",
									description: "EIP-712 typed data signature",
								},
								{
									name: "nonce",
									type: "uint256",
									description: "Unique nonce for replay protection",
								},
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
					<RelicDivider seed="writer-storage" />
					<Section
						title="WriterStorage"
						description="Storage contract that holds all entry data. Only the Writer logic contract can modify state, enforced by the onlyLogic modifier."
					>
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
					<RelicDivider seed="storage-color" />
					<Section
						title="ColorRegistry"
						description="Simple registry mapping user addresses to their chosen hex color."
					>
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
					<AnchorHeading
						id="api"
						className="text-3xl font-serif italic text-primary mb-1"
					>
						API
					</AnchorHeading>
					<p className={`${secondaryGray} mb-4`}>
						All write operations are authenticated via EIP-712 signatures.
					</p>
					<div>
						<span className={`${secondaryGray}`}>Base URL: </span>
						<div className="mb-4 bg-surface p-2">
							<p className={`${secondaryGray} flex items-center gap-2`}>
								<code className="font-mono text-primary">
									https://api.writer.place
								</code>
								<CopyButton value="https://api.writer.place" />
							</p>
						</div>
					</div>

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
								{
									name: "title",
									type: "string",
									description: `Writer title (max ${MAX_TITLE_LENGTH.toLocaleString()} characters)`,
								},
								{
									name: "admin",
									type: "address",
									description: "Admin address",
								},
								{
									name: "managers",
									type: "address[]",
									description: "Manager addresses",
								},
							]}
							response="{ writer: Writer }"
						/>
					</Section>
					<RelicDivider seed="writers-entries" />
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
								{
									name: "id",
									type: "string",
									description: "Database entry ID",
								},
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
									description: `First chunk content (max ${MAX_CONTENT_LENGTH.toLocaleString()} characters)`,
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
								{
									name: "content",
									type: "string",
									description: `New content (max ${MAX_CONTENT_LENGTH.toLocaleString()} characters)`,
								},
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
					<RelicDivider seed="entries-color" />
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
					<RelicDivider seed="color-user" />
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

				{/* CONTENT ENCODING */}
				<div>
					<AnchorHeading
						id="content-encoding"
						className="text-3xl font-serif italic text-primary mb-1"
					>
						Content Encoding
					</AnchorHeading>
					<p className={`${secondaryGray} mb-4`}>
						Entry content goes through a multi-step encoding pipeline before
						being stored onchain. The <code className="font-mono">content</code>{" "}
						& <code className="font-mono">chunkContent</code> fields in API
						requests contain the final encoded string, not raw markdown.
					</p>

					<div className="mb-4 bg-surface p-2">
						<p className={`font-mono ${secondaryGray} text-center`}>
							markdown &rarr; compress &rarr; encrypt (optional) &rarr; prefix
							&rarr; store
						</p>
					</div>

					<Section
						title="Format Prefixes"
						description="The version prefix at the start of the stored content string indicates how to decode it."
					>
						<div className="space-y-6">
							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6">
								<code className="font-mono font-bold text-primary">br:</code>
								<p className={`${secondaryGray} mt-1`}>
									Public entry. Brotli compressed, Base64 encoded. No
									encryption.
								</p>
								<p className={`${secondaryGray} mt-1 font-mono text-sm`}>
									br:GxoAAI2pVgqN...
								</p>
							</div>

							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6">
								<code className="font-mono font-bold text-primary">
									enc:v3:br:
								</code>
								<p className={`${secondaryGray} mt-1`}>
									Private entry, current format. AES-GCM encrypted with v3 key,
									Brotli compressed.
								</p>
								<p className={`${secondaryGray} mt-1 font-mono text-sm`}>
									enc:v3:br:A7f3kQ9x...
								</p>
							</div>

							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6 opacity-50">
								<code className="font-mono font-bold">enc:v2:br:</code>
								<p className={`${secondaryGray} mt-1`}>Deprecated</p>
							</div>

							<div className="pb-6 opacity-50">
								<code className="font-mono font-bold">enc:br:</code>
								<p className={`${secondaryGray} mt-1`}>Deprecated</p>
							</div>
						</div>
					</Section>
					<RelicDivider seed="prefixes-compression" />
					<Section
						title="Compression"
						description="All content is compressed with Brotli at quality level 11 (maximum), then Base64 encoded. This reduces onchain storage costs."
					>
						<div className="bg-surface-raised p-2">
							<p className={`font-mono ${secondaryGray} text-sm text-center`}>
								markdown &rarr; TextEncoder &rarr; Brotli compress (quality 11)
								&rarr; Base64 encode
							</p>
						</div>
					</Section>
					<RelicDivider seed="compression-encryption" />
					<Section
						title="Encryption"
						description="Private entries are encrypted after compression using AES-GCM with a 128-bit key and 12-byte random IV."
					>
						<div className="bg-surface-raised p-2 mb-4">
							<p className={`font-mono ${secondaryGray} text-sm text-center`}>
								compressed content &rarr; AES-GCM encrypt &rarr; prepend IV
								&rarr; Base64 encode
							</p>
						</div>

						<p className={`${secondaryGray} mb-4`}>
							The encryption key is deterministically derived from a wallet
							signature:
						</p>

						<ol
							className={`${secondaryGray} list-decimal list-inside space-y-2`}
						>
							<li>
								User signs a fixed message with{" "}
								<code className="font-mono text-primary">personal_sign</code>
							</li>
							<li>Signature is hashed with Keccak-256</li>
							<li>First 16 bytes of the hash become the AES key</li>
						</ol>

						<p className={`${secondaryGray} mb-4`}>
							The key never leaves the client. Only the entry author can decrypt
							their private entries &mdash; the server and contract store opaque
							ciphertext.
						</p>

						<p className={`${secondaryGray} mb-4`}>
							V1, V2, and V3 keys differ only in the message signed during key
							derivation. V3 is the current default and includes a security
							warning to only sign on writer.place. V1 and V2 are supported for
							backward compatibility with older entries. A migration tool is
							available in the app to re-encrypt legacy entries with the V3 key.
						</p>
					</Section>
					<RelicDivider seed="encryption-decoding" />
					<Section
						title="Decoding"
						description="To read an entry, reverse the pipeline based on the prefix."
					>
						<div className="space-y-6">
							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6">
								<code className="font-mono font-bold text-primary">br:</code>
								<p className={`${secondaryGray} mt-1`}>
									Strip prefix &rarr; Base64 decode &rarr; Brotli decompress
								</p>
							</div>

							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6">
								<code className="font-mono font-bold text-primary">
									enc:v3:br:
								</code>
								<p className={`${secondaryGray} mt-1`}>
									Strip prefix &rarr; Base64 decode &rarr; AES-GCM decrypt (v3
									key) &rarr; Brotli decompress
								</p>
							</div>

							<div className="border-b border-neutral-300 dark:border-neutral-700 pb-6 opacity-50">
								<code className="font-mono font-bold">enc:v2:br:</code>
								<p className={`${secondaryGray} mt-1`}>Deprecated</p>
							</div>

							<div className="pb-6 opacity-50">
								<code className="font-mono font-bold">enc:br:</code>
								<p className={`${secondaryGray} mt-1`}>Deprecated</p>
							</div>
						</div>

						<p className={`${secondaryGray}`}>
							Public entries are decoded server-side and returned as plaintext
							in the{" "}
							<code className="font-mono text-primary">decompressed</code>{" "}
							field. Private entries are returned as the raw encoded string and
							decrypted client-side using the author&apos;s wallet.
						</p>
					</Section>
				</div>
			</div>
			<TableOfContents />
		</div>
	);
}
