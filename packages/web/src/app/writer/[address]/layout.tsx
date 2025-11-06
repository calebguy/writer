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
		<div className="flex flex-col grow">
			<div className="mb-4">
				<WriterHeader address={address} />
			</div>
			<div className="grow flex flex-col">{children}</div>
		</div>
	);
}
