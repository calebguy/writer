import { LandingPage } from "@/components/LandingPage";
import { getAuthenticatedUser } from "@/utils/auth";
import { getRandomForLines } from "@/utils/forLines";

export default async function Index() {
	const user = await getAuthenticatedUser();
	const forLines = getRandomForLines();
	return <LandingPage isLoggedIn={!!user} forLines={forLines} />;
}
