import { type NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
	return NextResponse.redirect(new URL("/opengraph-image", request.url));
}
