import { usePrivy } from "@privy-io/react-auth";
import { Footer } from "../components/Footer";
import { AuthedHeader } from "../components/Header/AuthedHeader";
import { BlankLayout } from "./Blank.layout";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const { ready, authenticated } = usePrivy();
	const isLoggedIn = ready && authenticated;

	return (
		<BlankLayout>
			{isLoggedIn && <AuthedHeader />}
			<div className="relative grow flex flex-col">{children}</div>
			<div className="mt-4">
				<Footer />
			</div>
		</BlankLayout>
	);
}
