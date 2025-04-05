import { usePrivy } from "@privy-io/react-auth";
import AuthedHome from "./AuthedHome";
import UnauthedHome from "./UnauthedHome";

export default function Home() {
	const { ready, authenticated } = usePrivy();
	return ready && authenticated ? <AuthedHome /> : <UnauthedHome />;
}
