import { Footer } from "@/components/Footer";
import { SavedHeader } from "@/components/header/SavedHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

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
			<div className="grow flex flex-col pb-20 md:pb-0">{children}</div>
			<Footer />
			<MobileBottomNav />
		</div>
	);
}
