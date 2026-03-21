import { LoginPrompt } from "@/components/LoginPrompt";
import { WriterList } from "@/components/WriterList";
import { getAuthenticatedUser } from "@/utils/auth";

export default async function Home() {
	const user = await getAuthenticatedUser();
	return user ? <WriterList user={user} /> : <LoginPrompt />;
}
