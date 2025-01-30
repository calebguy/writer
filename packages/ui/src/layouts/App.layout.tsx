import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { BlankLayout } from "./Blank.layout";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<BlankLayout>
			<Header />
			<div className="relative grow flex flex-col">{children}</div>
			<div className="mt-4">
				<Footer />
			</div>
		</BlankLayout>
	);
}
