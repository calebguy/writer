import { Footer } from "@/components/Footer";
import { DocsHeader } from "@/components/header/DocsHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<DocsHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
			<Footer />
		</div>
	);
}
