import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasAuthToken = request.cookies.has("privy-id-token");
	// privy-refresh-token persists longer than the id token and indicates an active session
	const hasRefreshToken = request.cookies.has("privy-refresh-token");

	// Skip middleware for the refresh page to prevent redirect loops
	if (pathname === "/refresh") {
		return NextResponse.next();
	}

	// User may be authenticated but token expired - redirect to refresh page
	if (!hasAuthToken && hasRefreshToken) {
		const refreshUrl = new URL("/refresh", request.url);
		refreshUrl.searchParams.set("redirect_url", pathname);
		return NextResponse.redirect(refreshUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/home", "/saved", "/refresh"],
};
