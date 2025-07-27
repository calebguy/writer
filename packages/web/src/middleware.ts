import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Routes } from "./utils/routes";

export function middleware(request: NextRequest) {
	// Get the pathname of the request
	const path = request.nextUrl.pathname;

	// Define protected routes that require authentication
	const protectedRoutes = [Routes.Home, Routes.Writer, Routes.WriterId];

	// Check if the current path is a protected route
	const isProtectedRoute = protectedRoutes.some((route) =>
		path.startsWith(route),
	);

	if (isProtectedRoute) {
		// Check for Privy session token in cookies
		const privyToken = request.cookies.get("privy-token")?.value;

		if (!privyToken) {
			// Redirect to login page if no token found
			const loginUrl = new URL(Routes.Index, request.url);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
