import { Footer } from "@/components/Footer";
import { AboutHeader } from "@/components/header/AboutHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<AboutHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
			<Footer />
		</div>
	);
}
