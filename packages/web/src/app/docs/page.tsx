"use client";

import Image from "next/image";
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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					className="text-primary"
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					className="cursor-pointer"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
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
		<div className="flex justify-center my-4">
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
}: { title: string; children: React.ReactNode }) {
	const id = slugify(title);
	return (
		<section className="bg-surface p-2 md:p-5">
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
		<div
			id={id}
			className="mb-8 border-b border-neutral-300 dark:border-neutral-700 pb-8 last:border-b-0 scroll-mt-24"
		>
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
				<span className={`font-mono  font-bold ${methodColor}`}>{method}</span>
				<code className="font-mono ">{path}</code>
				<span className="opacity-0 group-hover:opacity-100 transition-opacity font-normal ml-2 text-sm text-neutral-500 dark:text-neutral-400">
					&sect;
				</span>
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
		<div
			id={id}
			className="mb-8 border-b border-neutral-300 dark:border-neutral-700 pb-8 last:border-b-0 scroll-mt-24"
		>
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
				<p className={`${secondaryGray} mb-8 `}>
					Writer is an onchain writing platform. Content is permanently stored
					on Optimism through smart contracts.
				</p>

				{/* SMART CONTRACTS */}
				<div className="mb-24">
					<AnchorHeading
						id="smart-contracts"
						className="text-3xl font-serif italic text-primary mb-4"
					>
						Smart Contracts
					</AnchorHeading>

					<div className="mb-4 bg-surface p-2 md:p-5">
						<p
							className={`${secondaryGray} flex items-center gap-2 flex-wrap mb-2`}
						>
							<span>WriterFactory:</span>
							<a
								href="https://optimistic.etherscan.io/address/0x28c7721ECff2246a9277CAd46ab2124f69Efd88E"
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-primary break-all hover:underline"
							>
								0x28c7721ECff2246a9277CAd46ab2124f69Efd88E
							</a>
							<CopyButton value="0x28c7721ECff2246a9277CAd46ab2124f69Efd88E" />
						</p>
						<p className={`${secondaryGray} flex items-center gap-2 flex-wrap`}>
							<span>ColorRegistry:</span>
							<a
								href="https://optimistic.etherscan.io/address/0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1"
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-primary break-all hover:underline"
							>
								0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1
							</a>
							<CopyButton value="0x7Bf5B616f5431725bCE61E397173cd6FbFaAC6F1" />
						</p>
					</div>
					<RelicDivider seed="smart-contracts" />

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
					<Section title="Writer">
						<p className={`${secondaryGray}  mb-8`}>
							Main logic contract for managing entries with role-based access
							control.
						</p>

						<AnchorHeading
							id="reading"
							as="h3"
							className={`text-lg font-serif mb-6 ${secondaryGray}`}
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
							className={`text-lg font-serif mb-6 mt-12 ${secondaryGray}`}
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
							className={`text-lg font-serif mb-6 mt-12 ${secondaryGray}`}
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
					<RelicDivider seed="storage-color" />
					<Section title="ColorRegistry">
						<p className={`${secondaryGray}  mb-8`}>
							Simple registry mapping user addresses to their chosen hex color.
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
				<div>
					<AnchorHeading
						id="api"
						className="text-3xl font-serif italic text-primary mb-4"
					>
						API
					</AnchorHeading>
					<p className={`${secondaryGray} mb-4`}>
						All write operations are authenticated via EIP-712 signatures.
					</p>
					<div>
						<span className={`${secondaryGray}`}>Base URL: </span>
						<div className="mb-4 bg-surface p-2 md:p-5">
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
			</div>
			<TableOfContents />
		</div>
	);
}
