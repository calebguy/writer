import { DocsHeader } from "@/components/header/DocsHeader";
import { Footer } from "@/components/Footer";

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
			<div className="grow flex flex-col pb-20 md:pb-0">{children}</div>
			<Footer />
		</div>
	);
}
