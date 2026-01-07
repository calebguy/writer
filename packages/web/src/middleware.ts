import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const hasAuthToken = request.cookies.has("privy-id-token");

	// Authenticated users visiting root → redirect to /home
	if (pathname === "/" && hasAuthToken) {
		return NextResponse.redirect(new URL("/home", request.url));
	}

	// Unauthenticated users visiting /home → redirect to root
	if (pathname === "/home" && !hasAuthToken) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/home"],
};
