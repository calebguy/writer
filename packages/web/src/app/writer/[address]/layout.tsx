import { WriterHeader } from "@/components/header/WriterHeader";

export default async function Layout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: Promise<{ address: string }>;
}>) {
	const { address } = await params;
	return (
		<div className="flex flex-col grow min-h-0">
			<div className="mb-4 flex-shrink-0">
				<WriterHeader address={address} />
			</div>
			<div className="grow flex flex-col relative min-h-0 overflow-auto">{children}</div>
		</div>
	);
}
