import {
	PrivyClient,
	type User,
	type WalletWithMetadata,
} from "@privy-io/server-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Routes } from "./routes";

if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_SECRET) {
	throw new Error("PRIVY_APP_ID and PRIVY_SECRET must be set");
}

const privy = new PrivyClient(
	process.env.PRIVY_APP_ID,
	process.env.PRIVY_SECRET,
);

export async function getAuthenticatedUser() {
	const cookieStore = await cookies();
	const privyIdToken = cookieStore.get("privy-id-token")?.value;

	if (!privyIdToken) {
		return null;
	}

	try {
		const user = await privy.getUser({ idToken: privyIdToken });
		return user;
	} catch (error) {
		console.error("Failed to verify Privy token:", error);
		return null;
	}
}

type UserWithWallet = User & { wallet: Omit<WalletWithMetadata, "type"> };
export async function requireAuth(): Promise<UserWithWallet> {
	console.log("requireAuth");
	const user = await getAuthenticatedUser();
	console.log(user);

	if (!user) {
		redirect(Routes.Index);
	}

	return user as UserWithWallet;
}

export async function requireGuest() {
	console.log("requireGuest");
	const user = await getAuthenticatedUser();
	console.log("requireGuest", user);
	if (user) {
		redirect(Routes.Home);
	}
}
