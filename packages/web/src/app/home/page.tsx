import { WriterList } from "@/components/WriterList";
import { getWritersByManager } from "@/utils/api";
import { requireAuth } from "@/utils/auth";

export default async function Home() {
	const user = await requireAuth();
	const writers = await getWritersByManager(user.wallet.address);
	return <WriterList writers={writers} user={user} />;
}
