import SavedView from "@/components/SavedView";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function SavedPage() {
	const user = await getAuthenticatedUser();
	return <SavedView initialLoggedIn={!!user} />;
}
