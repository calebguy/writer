import { WritersForManager } from "@/components/WritersForManager";
import { getWritersByManager } from "@/utils/api";
import { requireAuth } from "@/utils/auth";

export default async function Home() {
	const user = await requireAuth();
	const writers = await getWritersByManager(user.wallet.address);
	return <WritersForManager writers={writers} user={user} />;
}
