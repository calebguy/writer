import { type To, useLocation } from "react-router-dom";
import { DocsHeader } from "../components/Header/DocsHeader";
import { cn } from "../utils/cn";

export function DocsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="grow flex flex-col pt-8 pb-2 px-8">
			<DocsHeader />
			<div className="flex grow mt-4">
				<div className="flex grow">
					<Sidebar />
					{children}
				</div>
			</div>
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
								to: "#writer-create-entry",
								title: "Create Entry",
							},
							{
								to: "#writer-add-chunk",
								title: "Add Chunk to Entry",
							},
							{
								to: "#writer-create-with-chunk",
								title: "Create Entry with Chunk",
							},
							{
								to: "#writer-update",
								title: "Update Entry",
							},
							{
								to: "#writer-remove",
								title: "Remove Entry",
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
