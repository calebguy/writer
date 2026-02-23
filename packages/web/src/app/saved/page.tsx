import SavedView from "@/components/SavedView";
import { requireAuth } from "@/utils/auth";
import type { Hex } from "viem";

export default async function SavedPage() {
	const user = await requireAuth();
	return <SavedView userAddress={user.wallet.address as Hex} />;
}
