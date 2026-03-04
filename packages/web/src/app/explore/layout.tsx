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
			<div className="grow flex flex-col pb-20 md:pb-0">{children}</div>
			<MobileBottomNav />
		</div>
	);
}
