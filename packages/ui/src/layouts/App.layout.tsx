import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="h-full flex flex-col">
			<Header />
			{children}
			<Footer />
		</div>
	);
}
