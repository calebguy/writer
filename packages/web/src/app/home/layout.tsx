import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { HomeHeader } from "../../components/header/HomeHeader";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col grow">
			<div className="mb-4">
				<HomeHeader />
			</div>
			<div className="grow flex flex-col">{children}</div>
			<Footer />
			<MobileBottomNav />
		</div>
	);
}
