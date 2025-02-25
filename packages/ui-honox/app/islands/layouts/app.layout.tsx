import { PrivyProvider } from "@privy-io/react-auth";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { BlankLayout } from "./blank.layout";

interface AppLayoutProps {
	children: React.ReactNode;
	pathname: string;
}

const PRIVY_APP_ID = "clzekejfs079912zv96ahfm5a";

export function AppLayout({ children, pathname }: AppLayoutProps) {
	return (
		<BlankLayout>
			<PrivyProvider appId={PRIVY_APP_ID}>
				<Header pathname={pathname} />
				<div className="relative grow flex flex-col">{children}</div>
				<div className="mt-4">
					<Footer />
				</div>
			</PrivyProvider>
		</BlankLayout>
	);
}
