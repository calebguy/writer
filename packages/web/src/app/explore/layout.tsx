import { Footer } from "@/components/Footer";
import { ExploreHeader } from "@/components/header/ExploreHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

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
			<Footer />
			<MobileBottomNav />
		</div>
	);
}
