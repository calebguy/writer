import { createContext, useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import type { Writer } from "../utils/api";

interface AppLayoutProps {
	children: React.ReactNode;
}

interface SelectedWriterContent {
	writer: Writer | null;
	setWriter: (content: Writer | null) => void;
}

export const WriterContext = createContext<SelectedWriterContent>({
	writer: null,
	setWriter: () => {},
});

export function AppLayout({ children }: AppLayoutProps) {
	const [writer, setWriter] = useState<SelectedWriterContent["writer"]>(null);
	return (
		<div className="grow flex flex-col">
			<WriterContext.Provider value={{ writer, setWriter }}>
				<Header />
				{children}
			</WriterContext.Provider>
			<Footer />
		</div>
	);
}
