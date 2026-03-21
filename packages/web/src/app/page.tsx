import { LandingPage } from "@/components/LandingPage";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function Index() {
	const user = await getAuthenticatedUser();
	return <LandingPage isLoggedIn={!!user} />;
}
