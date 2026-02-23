import { SavedHeader } from "@/components/header/SavedHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<SavedHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
		</div>
	);
}
