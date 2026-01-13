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
					// User is authenticated, redirect to intended destination
					router.replace(redirectUrl);
				} else {
					// User is not authenticated, redirect to login
					router.replace("/");
				}
			} catch (error) {
				console.error("Failed to refresh token:", error);
				router.replace("/");
			}
		}

		// If already authenticated, go directly to destination
		if (authenticated) {
			router.replace(redirectUrl);
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
