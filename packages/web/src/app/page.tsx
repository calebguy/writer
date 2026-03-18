import { LandingPage } from "@/components/LandingPage";
import { requireGuest } from "@/utils/auth";

export default async function Index() {
	await requireGuest();
	return <LandingPage />;
}
