"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function RefreshContent() {
	const { ready, authenticated, getAccessToken } = usePrivy();
	const router = useRouter();
	const searchParams = useSearchParams();
	const redirectUrl = searchParams.get("redirect_url") || "/home";

	useEffect(() => {
		if (!ready) return;

		async function refreshAndRedirect() {
			try {
				const token = await getAccessToken();
				if (token) {
					// User is authenticated — full reload so cookies are sent to middleware
					window.location.replace(redirectUrl);
				} else {
					// User is not authenticated — append refreshed param to prevent loop
					const url = new URL("/", window.location.origin);
					url.searchParams.set("refreshed", "1");
					window.location.replace(url.toString());
				}
			} catch (error) {
				console.error("Failed to refresh token:", error);
				const url = new URL("/", window.location.origin);
				url.searchParams.set("refreshed", "1");
				window.location.replace(url.toString());
			}
		}

		// If already authenticated, go directly to destination
		if (authenticated) {
			window.location.replace(redirectUrl);
		} else {
			// Try to refresh the token
			refreshAndRedirect();
		}
	}, [ready, authenticated, getAccessToken, router, redirectUrl]);

	// Show nothing while refreshing to avoid flash
	return null;
}

export default function RefreshPage() {
	return (
		<Suspense fallback={null}>
			<RefreshContent />
		</Suspense>
	);
}
