import { usePrivy } from "@privy-io/react-auth";
import { Footer } from "../components/Footer";
import { AuthedHeader } from "../components/Header/AuthedHeader";
import { BaseLayout } from "./Base";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const { ready, authenticated } = usePrivy();
	const isLoggedIn = ready && authenticated;

	return (
		<BaseLayout>
			{isLoggedIn && <AuthedHeader />}
			<div className="relative grow flex flex-col">{children}</div>
			{isLoggedIn && (
				<div className="mt-4 md:block hidden">
					<Footer />
				</div>
			)}
		</BaseLayout>
	);
}
