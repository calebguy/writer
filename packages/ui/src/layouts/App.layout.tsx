import { createContext, useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

interface AppLayoutProps {
	children: React.ReactNode;
}

interface HeaderContextType {
	headerContent: string | null;
	setHeaderContent: (content: string | null) => void;
}

export const HeaderContext = createContext<HeaderContextType>({
	headerContent: null,
	setHeaderContent: () => {},
});

export function AppLayout({ children }: AppLayoutProps) {
	const [headerContent, setHeaderContent] = useState<string | null>(null);
	return (
		<div className="grow flex flex-col">
			<HeaderContext.Provider value={{ headerContent, setHeaderContent }}>
				<Header />
				{children}
			</HeaderContext.Provider>
			<Footer />
		</div>
	);
}
