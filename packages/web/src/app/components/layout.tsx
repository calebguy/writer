import { Footer } from "@/components/Footer";
import { ComponentsHeader } from "@/components/header/ComponentsHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<ComponentsHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
			<Footer />
		</div>
	);
}
