import { PrivyClient } from "@privy-io/server-auth";
import { cookies } from "next/headers";

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
