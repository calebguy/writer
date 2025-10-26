import { WriterHeader } from "@/components/header/WriterHeader";

export default async function Layout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: { address: string };
}>) {
	const { address } = params;
	return (
		<div className="flex flex-col">
			<div className="mb-4">
				<WriterHeader address={address} />
			</div>
			<div>{children}</div>
		</div>
	);
}
