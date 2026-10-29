import { Footer } from "@/components/Footer";
import { FundHeader } from "@/components/header/FundHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<FundHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
			<Footer />
		</div>
	);
}
