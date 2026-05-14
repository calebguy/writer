import { NextResponse, type NextRequest } from "next/server";

type AcceptMatch = {
	q: number;
	specificity: number;
	order: number;
};

function parseQ(params: string[]) {
	const qParam = params.find((param) => param.trim().toLowerCase().startsWith("q="));
	if (!qParam) {
		return 1;
	}

	const value = Number(qParam.split("=")[1]);
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}

function matchTarget(accept: string, target: `${string}/${string}`): AcceptMatch {
	const [targetType, targetSubtype] = target.toLowerCase().split("/");
	const ranges = accept
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);

	let best: AcceptMatch = { q: 0, specificity: -1, order: Number.MAX_SAFE_INTEGER };

	for (const [order, range] of ranges.entries()) {
		const [mediaRange, ...params] = range.split(";").map((part) => part.trim());
		const [type, subtype] = mediaRange.toLowerCase().split("/");
		if (!type || !subtype) {
			continue;
		}

		const matches =
			(type === targetType && subtype === targetSubtype) ||
			(type === targetType && subtype === "*") ||
			(type === "*" && subtype === "*");
		if (!matches) {
			continue;
		}

		const specificity =
			type === targetType && subtype === targetSubtype
				? 2
				: type === targetType && subtype === "*"
					? 1
					: 0;
		const q = parseQ(params);

		if (
			q > best.q ||
			(q === best.q && specificity > best.specificity) ||
			(q === best.q && specificity === best.specificity && order < best.order)
		) {
			best = { q, specificity, order };
		}
	}

	return best;
}

function hasExplicitMarkdown(accept: string) {
	return accept.split(",").some((part) => {
		const [mediaRange, ...params] = part.trim().split(";").map((item) => item.trim());
		return mediaRange.toLowerCase() === "text/markdown" && parseQ(params) > 0;
	});
}

function prefersMarkdown(request: NextRequest) {
	const accept = request.headers.get("accept");
	if (!accept || !hasExplicitMarkdown(accept)) {
		return false;
	}

	const markdown = matchTarget(accept, "text/markdown");
	const html = matchTarget(accept, "text/html");
	if (markdown.q <= 0) {
		return false;
	}

	return (
		markdown.q > html.q ||
		(markdown.q === html.q && markdown.specificity > html.specificity) ||
		(markdown.q === html.q &&
			markdown.specificity === html.specificity &&
			markdown.order <= html.order)
	);
}

const placePathPattern = /^\/writer\/(0x[a-fA-F0-9]{40})$/;
const entryPathPattern = /^\/writer\/(0x[a-fA-F0-9]{40})\/(\d+)$/;

export function middleware(request: NextRequest) {
	if (!prefersMarkdown(request)) {
		return NextResponse.next();
	}

	const { pathname } = request.nextUrl;

	if (pathname === "/docs") {
		return NextResponse.rewrite(new URL("/api/docs-markdown", request.url));
	}

	if (pathname === "/explore") {
		return NextResponse.rewrite(new URL("/api/explore-markdown", request.url));
	}

	const entryMatch = pathname.match(entryPathPattern);
	if (entryMatch) {
		const [, address, id] = entryMatch;
		return NextResponse.rewrite(
			new URL(`/api/writer-markdown/${address}/${id}`, request.url),
		);
	}

	const placeMatch = pathname.match(placePathPattern);
	if (placeMatch) {
		const [, address] = placeMatch;
		return NextResponse.rewrite(
			new URL(`/api/writer-place-markdown/${address}`, request.url),
		);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/docs", "/explore", "/writer/:path*"],
};
