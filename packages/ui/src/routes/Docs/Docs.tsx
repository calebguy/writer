import { useEffect } from "react";
import { Link, type To, useLocation } from "react-router-dom";
import { Github } from "../../components/icons/Github";
import { MD } from "../../components/markdown/MD";
import { GITHUB_URL } from "../../constants";
import { cn } from "../../utils/cn";
import {
	factoryComputeWriterAddress,
	factoryComputeWriterStorageAddress,
	factoryCreate,
	writerCreatedEvent,
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
	const location = useLocation();
	return (
		<div className="border-r border-dashed border-secondary flex flex-col gap-12 pr-8 text-lg">
			<div>
				<div className="font-bold">Contracts</div>
				<div className="flex flex-col gap-1">
					<SidebarLink
						to="#writer-factory"
						title="WriterFactory"
						selected={location.hash === "#writer-factory"}
					/>
					<SidebarLink
						to="#writer"
						title="Writer"
						selected={location.hash === "#writer"}
					/>
				</div>
			</div>
			<div>
				<div className="font-bold">API</div>
				<div className="flex flex-col gap-1">
					<SidebarLink
						to="#create-writer"
						title="Create Writer"
						selected={location.hash === "#create-writer"}
					/>
					<SidebarLink
						to="#get-writer-by-address"
						title="Get Writer by Address"
						selected={location.hash === "#get-writer-by-address"}
					/>
					<SidebarLink
						to="#get-writers-by-author"
						title="Get Writers by Author"
						selected={location.hash === "#get-writers-by-author"}
					/>
					<SidebarLink
						to="#create-entry"
						title="Create Entry"
						selected={location.hash === "#create-entry"}
					/>
					<SidebarLink
						to="#update-entry"
						title="Update Entry"
						selected={location.hash === "#update-entry"}
					/>
					<SidebarLink
						to="#delete-entry"
						title="Delete Entry"
						selected={location.hash === "#delete-entry"}
					/>
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
								<Methods
									methods={[
										factoryCreate,
										writerCreatedEvent,
										factoryComputeWriterStorageAddress,
										factoryComputeWriterAddress,
									]}
								/>
							</div>

							<div id="writer" className="mt-8">
								<div>
									<Copyable slug="writer">
										<div className="text-lg font-bold">Writer</div>
									</Copyable>
									<div className="text-neutral-400">
										Writer is a contract that holds your content in the form of
										Entries.
									</div>
								</div>
								<Methods
									methods={[
										factoryCreate,
										writerCreatedEvent,
										factoryComputeWriterStorageAddress,
										factoryComputeWriterAddress,
									]}
								/>
							</div>
						</Section>
						<div className="border-t border-dashed border-secondary my-4" />
						<Section id="api" title="API">
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

function Copyable({
	children,
	slug,
}: { children: React.ReactNode; slug: string }) {
	return (
		<div className="flex items-center gap-0.5 group">
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
	selected?: boolean;
}

function SidebarLink({ to, title, selected }: SidebarLinkProps) {
	return (
		<a
			className={cn(
				"text-neutral-400 transition-colors cursor-pointer inline-block",
				{
					"text-primary hover:text-primary": selected,
					"hover:text-secondary": !selected,
				},
			)}
			href={`/docs${to}`}
		>
			{title}
		</a>
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
