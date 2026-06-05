import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";
import { env } from "./env";

if (!env.PRIVY_SECRET) {
	throw new Error("PRIVY_SECRET must be set");
}

const privy = new PrivyClient(env.NEXT_PUBLIC_PRIVY_APP_ID, env.PRIVY_SECRET);
function getPrivyToken(cookieStore: Awaited<ReturnType<typeof cookies>>) {
	return (
		cookieStore.get("privy-token")?.value ??
		cookieStore.get("privy-id-token")?.value
	);
}



export async function getAuthenticatedUser() {
	const cookieStore = await cookies();
	const privyToken = getPrivyToken(cookieStore);

	if (!privyToken) {
		return null;
	}

	try {
		const user = await privy.getUser({ idToken: privyToken });
		return user;
	} catch (error) {
		console.error("Failed to verify Privy token:", error);
		return null;
	}
}

// Cheap cookie-only hint for first-paint UI. Returns true if Privy has an
// active session cookie (even when the access token has expired and will be
// refreshed client-side). Not a verification — for that, use getAuthenticatedUser.
export async function getAuthHint(): Promise<boolean> {
	const cookieStore = await cookies();
	return !!(
		getPrivyToken(cookieStore) ||
		cookieStore.get("privy-session")?.value
	);
}
