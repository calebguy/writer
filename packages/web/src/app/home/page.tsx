import { WritersForManager } from "@/components/WritersForManager";
import { getWritersByManager } from "@/utils/api";
import { requireAuth } from "@/utils/auth";

export default async function Home() {
	const user = await requireAuth();
	console.log("user", user);
	const writers = await getWritersByManager(user.wallet.address);
	return (
		<WritersForManager
			writers={writers}
			authedUserAddress={user.wallet.address}
		/>
	);
}
