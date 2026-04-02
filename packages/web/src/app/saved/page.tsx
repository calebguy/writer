import SavedView from "@/components/SavedView";
import { pickTwoLogos } from "@/utils/random";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function SavedPage() {
	const user = await getAuthenticatedUser();
	return <SavedView initialLoggedIn={!!user} loginLogos={pickTwoLogos()} />;
}
