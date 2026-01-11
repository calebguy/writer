import { WriterList } from "@/components/WriterList";
import { requireAuth } from "@/utils/auth";

export default async function Home() {
	const user = await requireAuth();
	// Data fetching moved to client-side (WriterList) for React Query caching
	// This makes navigating back to /home instant from cache
	return <WriterList user={user} />;
}
