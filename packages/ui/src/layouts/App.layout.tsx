import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	return (
		<div className="grow flex flex-col">
			<Header />
			{children}
			<Footer />
		</div>
	);
}
