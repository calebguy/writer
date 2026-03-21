import { LoginPrompt } from "@/components/LoginPrompt";
import SavedView from "@/components/SavedView";
import { getAuthenticatedUser } from "@/utils/auth";
import type { Hex } from "viem";

export default async function SavedPage() {
	const user = await getAuthenticatedUser();
	return user ? (
		<SavedView userAddress={user.wallet.address as Hex} />
	) : (
		<LoginPrompt />
	);
}
