import { WriterList } from "@/components/WriterList";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function Home() {
	const user = await getAuthenticatedUser();
	return <WriterList initialLoggedIn={!!user} />;
}
