import SavedView from "@/components/SavedView";
import { pickLogo } from "@/utils/random";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function SavedPage() {
	const user = await getAuthenticatedUser();
	return <SavedView initialLoggedIn={!!user} loginLogo={pickLogo()} />;
}
