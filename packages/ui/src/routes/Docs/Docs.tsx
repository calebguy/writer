import { useEffect } from "react";
import { Link, type To, useLocation } from "react-router-dom";
import { Github } from "../../components/icons/Github";
import { MD } from "../../components/markdown/MD";
import { GITHUB_URL } from "../../constants";
import { cn } from "../../utils/cn";
import {
	baseUrlSnipped,
	chunkReceivedEvent,
	entryCompletedEvent,
	entryCreatedEvent,
	entryObjectSnippet,
	entryRemovedEvent,
	entryStruct,
	entryUpdatedEvent,
	factoryComputeWriterAddress,
	factoryComputeWriterStorageAddress,
	factoryCreate,
	writerAddChunk,
	writerAddChunkWithSig,
	writerCreate,
	writerCreateWithChunk,
	writerCreateWithChunkWithSig,
	writerCreateWithSig,
	writerCreatedEvent,
	writerGetEntry,
	writerGetEntryChunk,
	writerGetEntryContent,
	writerGetEntryCount,
	writerGetEntryIds,
	writerGetEntryTotalChunks,
	writerObjectSnippet,
	writerRemove,
	writerRemoveWithSig,
	writerUpdate,
	writerUpdateWithSig,
} from "./code";

import { Link as LinkIcon } from "../../components/icons/Link";

function Header() {
	return (
		<div className="flex justify-between items-center">
			<div className="flex items-center gap-1.5 text-3xl">
				<Link to="/">
					<span className="text-secondary hover:text-primary transition-colors">
						Writer
					</span>
				</Link>
				<span className="text-primary">Docs</span>
			</div>
			<Link
				to={GITHUB_URL}
				target="_blank"
				rel="noreferrer noopener"
				className="text-neutral-600 hover:text-primary"
			>
				<Github className="w-6 h-6" />
			</Link>
		</div>
	);
}

function Sidebar() {
	return (
		<div className="border-r border-dashed border-secondary flex-col gap-12 pr-8 text-lg hidden lg:flex">
			<div>
				<div className="font-bold">Contracts</div>
				<div className="flex flex-col gap-3">
					<SidebarLink
						to="#writer-factory"
						title="WriterFactory"
						subLinks={[
							{
								to: "#writer-factory-create",
								title: "Create",
							},
							{
								to: "#compute-writer-storage-address",
								title: "Compute Writer Storage Address",
							},
							{
								to: "#compute-writer-address",
								title: "Compute Writer Address",
							},
						]}
					/>
					<SidebarLink
						to="#writer"
						title="Writer"
						subLinks={[
							{
								to: "#writer-create",
								title: "Create",
							},
							{
								to: "#writer-add-chunk",
								title: "Add Chunk",
							},
							{
								to: "#writer-create-with-chunk",
								title: "Create with Chunk",
							},
							{
								to: "#writer-update",
								title: "Update",
							},
							{
								to: "#writer-remove",
								title: "Remove",
							},
							{
								to: "#writer-create-with-sig",
								title: "Create With Sig",
							},
							{
								to: "#writer-add-chunk-with-sig",
								title: "Add Chunk With Sig",
							},
							{
								to: "#writer-create-with-chunk-with-sig",
								title: "Create With Chunk With Sig",
							},
							{
								to: "#writer-update-with-sig",
								title: "Update With Sig",
							},
							{
								to: "#writer-remove-with-sig",
								title: "Remove With Sig",
							},
							{
								to: "#writer-get-entry-count",
								title: "Get Entry Count",
							},
							{
								to: "#writer-get-entry-ids",
								title: "Get Entry IDs",
							},
							{
								to: "#writer-get-entry",
								title: "Get Entry",
							},
							{
								to: "#writer-get-entry-content",
								title: "Get Entry Content",
							},
							{
								to: "#writer-get-entry-chunk",
								title: "Get Entry Chunk",
							},
							{
								to: "#writer-get-entry-total-chunks",
								title: "Get Entry Total Chunks",
							},
						]}
					/>
				</div>
			</div>
			<div>
				<div className="font-bold">API</div>
				<div className="flex flex-col gap-1">
					<SidebarLink
						to="#writer-api"
						title="/writer"
						subLinks={[
							{
								to: "#create-writer",
								title: "POST",
							},
							{
								to: "#get-writer-by-address",
								title: "GET",
							},
						]}
					/>
					<SidebarLink
						to="#entry-api"
						title="/entry"
						subLinks={[
							{
								to: "#create-entry",
								title: "POST",
							},
							{
								to: "#update-entry",
								title: "PUT",
							},
							{
								to: "#delete-entry",
								title: "DELETE",
							},
						]}
					/>
					{/* <SidebarLink to="#create-writer" title="Create Writer" />
					<SidebarLink
						to="#get-writer-by-address"
						title="Get Writer by Address"
					/>
					<SidebarLink
						to="#get-writers-by-author"
						title="Get Writers by Author"
					/>
					<SidebarLink to="#create-entry" title="Create Entry" />
					<SidebarLink to="#update-entry" title="Update Entry" />
					<SidebarLink to="#delete-entry" title="Delete Entry" /> */}
				</div>
			</div>
		</div>
	);
}

export function Docs() {
	useEffect(() => {
		const hash = window.location.hash;
		if (hash) {
			const element = document.getElementById(hash.slice(1));
			if (element) {
				element.scrollIntoView({ behavior: "smooth" });
			}
		}
	}, []);
	return (
		<div className="grow flex flex-col">
			<Header />
			<div className="flex grow mt-4">
				<Sidebar />
				<div className="flex-1 p-4 overflow-y-auto grow scroll-smooth">
					<div className="grow h-1">
						<Section id="contracts" title="Contracts">
							<div id="writer-factory">
								<div>
									<Copyable slug="writer-factory">
										<div className="text-lg font-bold">WriterFactory</div>
									</Copyable>
									<div className="text-neutral-400">
										WriterFactory is a factory contract that creates Writers.
										Writers hold your content in the form of Entries.
									</div>
								</div>
								<div className="flex flex-col gap-4 mt-2">
									<Item
										id="writer-factory-create"
										title="Create"
										code={factoryCreate + writerCreatedEvent}
									/>
									<Item
										id="compute-writer-storage-address"
										title="Compute Writer Storage Address"
										code={factoryComputeWriterStorageAddress}
									/>
									<Item
										id="compute-writer-address"
										title="Compute Writer Address"
										code={factoryComputeWriterAddress}
									/>
								</div>
							</div>

							<div id="writer" className="mt-8">
								<div>
									<Copyable slug="writer">
										<div className="text-lg font-bold">Writer</div>
									</Copyable>
									<div className="text-neutral-400">
										Writer is a contract that holds your content in the form of
										Entries. It calls WriterStorage to store and retrieve your
										content. WriterStorage its-self cannot be used directly,
										rather it is interfaced with by the Writer contract.
									</div>
								</div>
								<div>
									<MD>{entryStruct}</MD>
									<MD>{entryCreatedEvent}</MD>
									<MD>{entryUpdatedEvent}</MD>
									<MD>{entryRemovedEvent}</MD>
									<MD>{entryCompletedEvent}</MD>
									<MD>{chunkReceivedEvent}</MD>
								</div>
								<div className="flex flex-col gap-4 mt-2">
									<Item id="writer-create" title="Create" code={writerCreate} />
									<Item
										id="writer-add-chunk"
										title="Add Chunk"
										code={writerAddChunk}
									/>
									<Item
										id="writer-create-with-chunk"
										title="Create with Chunk"
										code={writerCreateWithChunk}
									/>
									<Item id="writer-update" title="Update" code={writerUpdate} />
									<Item id="writer-remove" title="Remove" code={writerRemove} />
								</div>
								<div className="border-t border-dashed border-neutral-600 my-6" />
								<div className="flex flex-col gap-4">
									<Item
										id="writer-create-with-sig"
										title="Create With Sig"
										code={writerCreateWithSig}
									/>
									<Item
										id="writer-add-chunk-with-sig"
										title="Add Chunk With Sig"
										code={writerAddChunkWithSig}
									/>
									<Item
										id="writer-create-with-chunk-with-sig"
										title="Create with Chunk With Sig"
										code={writerCreateWithChunkWithSig}
									/>
									<Item
										id="writer-update-with-sig"
										title="Update With Sig"
										code={writerUpdateWithSig}
									/>
									<Item
										id="writer-remove-with-sig"
										title="Remove With Sig"
										code={writerRemoveWithSig}
									/>
								</div>
								<div className="border-t border-dashed border-neutral-600 my-6" />
								<div className="flex flex-col gap-4">
									<Item
										id="writer-get-entry-count"
										title="Get Entry Count"
										code={writerGetEntryCount}
									/>
									<Item
										id="writer-get-entry-ids"
										title="Get Entry IDs"
										code={writerGetEntryIds}
									/>
									<Item
										id="writer-get-entry"
										title="Get Entry"
										code={writerGetEntry}
									/>
									<Item
										id="writer-get-entry-content"
										title="Get Entry Content"
										code={writerGetEntryContent}
									/>
									<Item
										id="writer-get-entry-chunk"
										title="Get Entry Chunk"
										code={writerGetEntryChunk}
									/>
									<Item
										id="writer-get-entry-total-chunks"
										title="Get Entry Total Chunks"
										code={writerGetEntryTotalChunks}
									/>
								</div>
							</div>
						</Section>
						<div className="border-t border-dashed border-secondary my-4" />
						<Section id="api" title="API">
							<div>
								<div className="text-lg font-bold">Base URL</div>
								<MD>{baseUrlSnipped}</MD>
							</div>
							<div>
								<div className="text-lg font-bold">Writer Object</div>
								<MD>{writerObjectSnippet}</MD>
							</div>
							<div>
								<div className="text-lg font-bold">Entry Object</div>
								<MD>{entryObjectSnippet}</MD>
							</div>
							<div id="create-writer">
								<Copyable slug="create-writer">
									<div className="text-lg font-bold">Create Writer</div>
								</Copyable>
								<div className="text-neutral-400">Create a new Writer</div>
							</div>
							<div id="get-writer-by-address">
								<Copyable slug="get-writer-by-address">
									<div className="text-lg font-bold">Get Writer by Address</div>
								</Copyable>
								<div className="text-neutral-400">Get a Writer by Address</div>
							</div>
							<div id="get-writers-by-author">
								<Copyable slug="get-writers-by-author">
									<div className="text-lg font-bold">Get Writers by Author</div>
								</Copyable>
								<div className="text-neutral-400">Get Writers by Author</div>
							</div>
							<div id="create-entry">
								<Copyable slug="create-entry">
									<div className="text-lg font-bold">Create Entry</div>
								</Copyable>
								<div className="text-neutral-400">Create an Entry</div>
							</div>
							<div id="update-entry">
								<Copyable slug="update-entry">
									<div className="text-lg font-bold">Update Entry</div>
								</Copyable>
								<div className="text-neutral-400">Update an Entry</div>
							</div>
							<div id="delete-entry">
								<Copyable slug="delete-entry">
									<div className="text-lg font-bold">Delete Entry</div>
								</Copyable>
								<div className="text-neutral-400">Delete an Entry</div>
							</div>
						</Section>
					</div>
				</div>
			</div>
		</div>
	);
}

function Item({
	id,
	title,
	description,
	code,
}: { id: string; title: string; description?: string; code: string }) {
	return (
		<div id={id}>
			<Copyable slug={id}>
				<div className="text-lg">{title}</div>
			</Copyable>
			{description && <div className="text-neutral-400">{description}</div>}
			<MD>{code}</MD>
		</div>
	);
}

function Copyable({
	children,
	slug,
}: { children: React.ReactNode; slug: string }) {
	return (
		<div className="flex items-center gap-1 group">
			{children}
			<button
				onClick={() => {
					navigator.clipboard.writeText(
						`${import.meta.env.VITE_BASE_URL}/docs#${slug}`,
					);
				}}
				type="button"
				className="text-neutral-400 hover:text-secondary transition-colors cursor-pointer hidden group-hover:block active:text-primary active:scale-105"
			>
				<LinkIcon className="w-4 h-4 mb-0.5" />
			</button>
		</div>
	);
}

interface SidebarLinkProps {
	to: To;
	title?: string;
	subLinks?: {
		to: To;
		title: string;
	}[];
}

function SidebarLink({ to, title, subLinks }: SidebarLinkProps) {
	const location = useLocation();
	const subLinksSelected = subLinks?.some(
		(subLink) => location.hash === subLink.to,
	);
	const isSelected = location.hash === to;

	if (subLinks) {
		return (
			<div>
				<div className="flex items-center gap-1.5">
					{isSelected && <span className="bg-primary rounded h-1 w-1" />}
					<a
						className={cn(
							"text-neutral-400 transition-colors cursor-pointer inline-block",
							{
								"text-primary hover:text-primary":
									isSelected && !subLinksSelected,
								"text-primary": subLinksSelected,
								"hover:text-secondary": !isSelected,
							},
						)}
						href={`/docs${to}`}
					>
						{title}
					</a>
				</div>
				<div className="text-base ml-2 flex flex-col gap-0">
					{subLinks.map((subLink) => (
						<SidebarLink
							key={subLink.title}
							to={subLink.to}
							title={subLink.title}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<span className="flex items-center gap-1.5">
			{isSelected && <span className="bg-primary rounded h-1 w-1" />}
			<a
				className={cn(
					"text-neutral-400 transition-colors cursor-pointer inline-block",
					{
						"text-primary hover:text-primary": isSelected,
						"hover:text-secondary": !isSelected,
					},
				)}
				href={`/docs${to}`}
			>
				{title}
			</a>
		</span>
	);
}

function Section({
	id,
	children,
	title,
}: {
	children: React.ReactNode;
	id: string;
	title: string;
}) {
	return (
		<section id={id} className="flex flex-col gap-4">
			<Copyable slug={`/docs#${id}`}>
				<div className="text-xl font-bold">{title}</div>
			</Copyable>
			{children}
		</section>
	);
}

function Methods({ methods }: { methods: string[] }) {
	return (
		<div className="mt-6">
			<div className="text-neutral-400">Methods</div>
			<div className="flex flex-col gap-1 text-sm mt-1">
				{methods.map((method) => (
					<MD key={method}>{method}</MD>
				))}
			</div>
		</div>
	);
}
