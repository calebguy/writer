import { ExploreHeader } from "@/components/header/ExploreHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<ExploreHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
		</div>
	);
}
