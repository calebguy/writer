import { type NextRequest, NextResponse } from "next/server";

type RouteParams = Promise<{ address: string }>;

export async function GET(
	request: NextRequest,
	{ params }: { params: RouteParams },
) {
	const { address } = await params;
	return NextResponse.redirect(
		new URL(
			`/writer/${encodeURIComponent(address)}/opengraph-image`,
			request.url,
		),
	);
}
