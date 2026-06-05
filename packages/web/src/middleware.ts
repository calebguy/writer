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


function base64Url(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

function createNonce() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return base64Url(bytes);
}

function originFromUrl(value: string | undefined) {
	if (!value) return null;
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

function buildContentSecurityPolicy(nonce: string) {
	const apiOrigin =
		originFromUrl(process.env.NEXT_PUBLIC_BASE_URL) ?? "https://api.writer.place";
	const isDevelopment = process.env.NODE_ENV !== "production";
	const devConnectSources = isDevelopment
		? [
				"http://localhost:*",
				"ws://localhost:*",
				"http://127.0.0.1:*",
				"ws://127.0.0.1:*",
			]
		: [];

	const directives = [
		["default-src", "'self'"],
		[
			"script-src",
			"'self'",
			`'nonce-${nonce}'`,
			"https://challenges.cloudflare.com",
			"https://hcaptcha.com",
			"https://*.hcaptcha.com",
		],
		[
			"style-src",
			"'self'",
			"'unsafe-inline'",
			"https://hcaptcha.com",
			"https://*.hcaptcha.com",
		],
		["img-src", "'self'", "data:", "blob:", "https:"],
		["font-src", "'self'", "data:"],
		["object-src", "'none'"],
		["base-uri", "'self'"],
		["form-action", "'self'"],
		["frame-ancestors", "'none'"],
		[
			"child-src",
			"https://auth.privy.io",
			"https://privy.writer.place",
			"https://verify.walletconnect.com",
			"https://verify.walletconnect.org",
		],
		[
			"frame-src",
			"https://auth.privy.io",
			"https://privy.writer.place",
			"https://verify.walletconnect.com",
			"https://verify.walletconnect.org",
			"https://challenges.cloudflare.com",
			"https://hcaptcha.com",
			"https://*.hcaptcha.com",
		],
		[
			"connect-src",
			"'self'",
			apiOrigin,
			"https://writer.place",
			"https://auth.privy.io",
			"https://privy.writer.place",
			"wss://relay.walletconnect.com",
			"wss://relay.walletconnect.org",
			"wss://www.walletlink.org",
			"https://*.rpc.privy.systems",
			"https://explorer-api.walletconnect.com",
			"https://hcaptcha.com",
			"https://*.hcaptcha.com",
			...devConnectSources,
		],
		["worker-src", "'self'", "blob:"],
		["media-src", "'self'", "data:", "blob:"],
		["manifest-src", "'self'"],
	];

	return directives.map((directive) => directive.join(" ")).join("; ");
}
function cspResponseHeaderName() {
	return process.env.WRITER_CSP_MODE === "enforce"
		? "Content-Security-Policy"
		: "Content-Security-Policy-Report-Only";
}


function responseWithSecurityHeaders(
	request: NextRequest,
	responseFactory: (requestHeaders: Headers) => NextResponse,
) {
	const nonce = createNonce();
	const csp = buildContentSecurityPolicy(nonce);
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-nonce", nonce);
	requestHeaders.set("Content-Security-Policy", csp);

	const response = responseFactory(requestHeaders);
	response.headers.set(cspResponseHeaderName(), csp);
	return response;
}

const placePathPattern = /^\/writer\/(0x[a-fA-F0-9]{40})$/;
const entryPathPattern = /^\/writer\/(0x[a-fA-F0-9]{40})\/(\d+)$/;

export function middleware(request: NextRequest) {
	return responseWithSecurityHeaders(request, (requestHeaders) => {
		if (!prefersMarkdown(request)) {
			return NextResponse.next({
				request: {
					headers: requestHeaders,
				},
			});
		}

		const { pathname } = request.nextUrl;

		if (pathname === "/docs") {
			return NextResponse.rewrite(new URL("/api/docs-markdown", request.url), {
				request: {
					headers: requestHeaders,
				},
			});
		}

		if (pathname === "/explore") {
			return NextResponse.rewrite(new URL("/api/explore-markdown", request.url), {
				request: {
					headers: requestHeaders,
				},
			});
		}

		const entryMatch = pathname.match(entryPathPattern);
		if (entryMatch) {
			const [, address, id] = entryMatch;
			return NextResponse.rewrite(
				new URL(`/api/writer-markdown/${address}/${id}`, request.url),
				{
					request: {
						headers: requestHeaders,
					},
				},
			);
		}

		const placeMatch = pathname.match(placePathPattern);
		if (placeMatch) {
			const [, address] = placeMatch;
			return NextResponse.rewrite(
				new URL(`/api/writer-place-markdown/${address}`, request.url),
				{
					request: {
						headers: requestHeaders,
					},
				},
			);
		}

		return NextResponse.next({
			request: {
				headers: requestHeaders,
			},
		});
	});
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|images|favicon.ico|apple-icon.png|icon.png|opengraph-image.png|twitter-image.png|robots.txt|sitemap.xml).*)",
	],
};
