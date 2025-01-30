import { Link } from "react-router-dom";
import { Github } from "../components/icons/Github";
import { MD } from "../components/markdown/MD";
import { GITHUB_URL } from "../constants";

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
		<div className="border-r border-dashed border-secondary flex flex-col gap-12 p-4 text-lg">
			<div>
				<div className="font-bold">Contracts</div>
				<div className="text-neutral-400">Writer</div>
				<div className="text-neutral-400">WriterFactory</div>
			</div>
			<div>
				<div className="font-bold">API</div>
				<div className="text-neutral-400">Create Writer</div>
				<div className="text-neutral-400">Get Writer by Address</div>
				<div className="text-neutral-400">Get Writers by Author</div>
				<div className="text-neutral-400">Create Entry</div>
				<div className="text-neutral-400">Update Entry</div>
				<div className="text-neutral-400">Delete Entry</div>
			</div>
		</div>
	);
}

function Section({ children }: { children: React.ReactNode }) {
	return <div>{children}</div>;
}

const factoryCreate = `
\`\`\`solidity
function create(string calldata title, address admin, address[] memory managers, bytes32 salt) 
	returns (address writerAddress, address storeAddress)
\`\`\`
`;

const factoryComputeWriterStorageAddress = `
\`\`\`solidity
function computeWriterStorageAddress(bytes32 salt) 
	returns (address)
\`\`\`
`;

const factoryComputeWriterAddress = `
\`\`\`solidity
function computeWriterAddress(string title, address admin, address[] managers, bytes32 salt)
	returns (address writerAddress)
\`\`\`
`;

const writerCreatedEvent = `
\`\`\`solidity
event WriterCreated(
	address indexed writerAddress,
	address indexed storeAddress,
	address indexed admin,
	string title,
	address[] managers
);
\`\`\`
`;

export function Docs() {
	return (
		<div className="grow flex flex-col">
			<Header />
			<div className="flex grow mt-4">
				<Sidebar />
				<div className="flex-1 p-4 overflow-y-auto">
					<div id="contracts" className="flex flex-col gap-4">
						<div className="text-xl font-bold">Contracts</div>

						<div id="writer">
							<div className="text-xl font-bold">Writer</div>
							<div className="text-neutral-400">
								Writer is a contract that holds your content in the form of
								Entries.
							</div>
						</div>
						<div id="writer-factory">
							<div className="text-xl font-bold">WriterFactory</div>
							<div className="text-neutral-400">
								WriterFactory is a factory contract that creates Writers.
								Writers hold your content in the form of Entries.
							</div>
							<div className="mt-6">
								<div className="text-neutral-400">Methods</div>
								<div className="flex flex-col gap-1 text-sm mt-1">
									<div className="flex">
										<span className="text-primary mr-1.5 font-mono">write</span>
										<MD>{factoryCreate}</MD>
									</div>
									<div className="flex justify-center">
										<MD>{writerCreatedEvent}</MD>
									</div>
									<div className="flex">
										<span className="text-secondary mr-1.5 font-mono">
											read
										</span>
										<MD>{factoryComputeWriterStorageAddress}</MD>
									</div>
									<div className="flex">
										<span className="text-secondary mr-1.5 font-mono">
											read
										</span>
										<MD>{factoryComputeWriterAddress}</MD>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t border-dashed border-secondary my-4" />

					<div id="api" className="flex flex-col gap-4">
						<div className="text-xl font-bold">API</div>
						<div>
							<div className="text-xl font-bold">Create Writer</div>
							<div className="text-neutral-400">Create a new Writer</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
