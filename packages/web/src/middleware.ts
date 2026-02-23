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

	// Authenticated users visiting root → redirect to /home
	if (pathname === "/" && hasAuthToken) {
		return NextResponse.redirect(new URL("/home", request.url));
	}

	// User may be authenticated but token expired - redirect to refresh page
	// The refresh page will attempt to get a new token client-side
	if (pathname === "/" && !hasAuthToken && hasRefreshToken) {
		const refreshUrl = new URL("/refresh", request.url);
		refreshUrl.searchParams.set("redirect_url", "/home");
		return NextResponse.redirect(refreshUrl);
	}

	// Unauthenticated users visiting protected pages → check if they need refresh or login
	if ((pathname === "/home" || pathname === "/saved") && !hasAuthToken) {
		if (hasRefreshToken) {
			// May be authenticated, needs token refresh
			const refreshUrl = new URL("/refresh", request.url);
			refreshUrl.searchParams.set("redirect_url", pathname);
			return NextResponse.redirect(refreshUrl);
		}
		// No session at all, redirect to login
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/home", "/saved", "/refresh"],
};
