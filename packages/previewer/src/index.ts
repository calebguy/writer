import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const CACHE_SECONDS = 60 * 60 * 24 * 30;
const PREVIEW_CACHE_SECONDS = 300;
const MAX_URL_LENGTH = 2_048;
const SCREENSHOT_WIDTH = 1_200;
const SCREENSHOT_HEIGHT = 630;
const SCREENSHOT_TIMEOUT_MS = 10_000;
const JPEG_QUALITY = 72;
const DEFAULT_ALLOWED_ORIGINS = [
	"https://writer.place",
	"https://www.writer.place",
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

type AppContext = Context<{ Bindings: Env }>;

class RequestError extends Error {
	constructor(
		message: string,
		readonly status: ContentfulStatusCode,
	) {
		super(message);
		this.name = "RequestError";
	}
}

interface ScreenshotRequest {
	context: AppContext;
	normalizedUrl: string;
}

function normalizePreviewUrl(value: string | null) {
	if (!value) {
		throw new RequestError("Missing url query parameter.", 400);
	}
	if (value.length > MAX_URL_LENGTH) {
		throw new RequestError("URL is too long.", 400);
	}

	let target: URL;
	try {
		target = new URL(value);
	} catch {
		throw new RequestError("URL is invalid.", 400);
	}

	if (target.protocol !== "http:" && target.protocol !== "https:") {
		throw new RequestError("Only http and https URLs are supported.", 400);
	}
	if (target.username || target.password) {
		throw new RequestError("URLs with credentials are not supported.", 400);
	}
	if (target.port && target.port !== "80" && target.port !== "443") {
		throw new RequestError("Only standard web ports are supported.", 400);
	}
	if (isBlockedHost(target.hostname)) {
		throw new RequestError("This host is not supported.", 400);
	}

	target.hash = "";
	target.hostname = target.hostname.toLowerCase();
	return target.toString();
}

function isBlockedHost(hostname: string) {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	return (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host.endsWith(".local") ||
		host.endsWith(".internal") ||
		isIPv4Address(host) ||
		host.includes(":") ||
		/^[0-9]+$/.test(host)
	);
}

function isIPv4Address(host: string) {
	const parts = host.split(".");
	return (
		parts.length === 4 &&
		parts.every((part) => {
			if (!/^\d{1,3}$/.test(part)) return false;
			const value = Number(part);
			return value >= 0 && value <= 255;
		})
	);
}

async function sha256Hex(value: string) {
	const bytes = new TextEncoder().encode(value);
	const hash = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(hash)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function normalizedUrlFrom(context: AppContext) {
	return normalizePreviewUrl(context.req.query("url") ?? null);
}

function contentfulStatusCode(status: number): ContentfulStatusCode {
	if (status === 101 || status === 204 || status === 205 || status === 304) {
		return 502;
	}
	return status as ContentfulStatusCode;
}

function allowedOrigins(env: Env) {
	const configuredOrigins = env.ALLOWED_ORIGINS?.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return new Set(
		configuredOrigins && configuredOrigins.length > 0
			? configuredOrigins
			: DEFAULT_ALLOWED_ORIGINS,
	);
}

function assertAllowedOrigin(context: AppContext) {
	const origin = context.req.header("origin");
	if (!origin) {
		throw new RequestError("Origin is required.", 403);
	}

	let normalizedOrigin: string;
	try {
		normalizedOrigin = new URL(origin).origin;
	} catch {
		throw new RequestError("Origin is invalid.", 403);
	}

	if (!allowedOrigins(context.env).has(normalizedOrigin)) {
		throw new RequestError("Origin is not allowed.", 403);
	}
}

function previewResponse(context: AppContext) {
	const normalizedUrl = normalizedUrlFrom(context);
	const screenshotUrl = new URL("/screenshot", context.req.url);
	screenshotUrl.searchParams.set("url", normalizedUrl);

	return context.json(
		{
			url: normalizedUrl,
			screenshotUrl: screenshotUrl.toString(),
			cacheSeconds: CACHE_SECONDS,
		},
		200,
		{ "cache-control": `public, max-age=${PREVIEW_CACHE_SECONDS}` },
	);
}

async function cachedScreenshotResponse({
	context,
	normalizedUrl,
}: ScreenshotRequest) {
	const hash = await sha256Hex(normalizedUrl);
	const cacheKey = new Request(`https://previewer.cache/screenshots/${hash}`);
	const cached = await caches.default.match(cacheKey);
	if (cached) return cached;

	const screenshot = await context.env.BROWSER.quickAction("screenshot", {
		url: normalizedUrl,
		viewport: {
			width: SCREENSHOT_WIDTH,
			height: SCREENSHOT_HEIGHT,
			deviceScaleFactor: 1,
		},
		gotoOptions: {
			waitUntil: "networkidle2",
			timeout: SCREENSHOT_TIMEOUT_MS,
		},
		screenshotOptions: {
			type: "jpeg",
			quality: JPEG_QUALITY,
			fullPage: false,
		},
	});
	if (!screenshot.ok) {
		const retryAfter = screenshot.headers.get("retry-after");
		return context.json(
			{
				error: "Failed to render screenshot.",
				retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
			},
			contentfulStatusCode(screenshot.status),
			retryAfter ? { "retry-after": retryAfter } : undefined,
		);
	}

	const response = new Response(screenshot.body, {
		headers: {
			"cache-control": `public, max-age=${CACHE_SECONDS}, immutable`,
			"content-type": screenshot.headers.get("content-type") ?? "image/jpeg",
		},
	});
	context.executionCtx.waitUntil(
		caches.default.put(cacheKey, response.clone()),
	);
	return response;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
	"*",
	cors({
		origin(origin, context) {
			try {
				const normalizedOrigin = new URL(origin).origin;
				return allowedOrigins(context.env).has(normalizedOrigin)
					? normalizedOrigin
					: null;
			} catch {
				return null;
			}
		},
		allowMethods: ["GET", "OPTIONS"],
		allowHeaders: ["content-type"],
	}),
);

app.use("*", async (context, next) => {
	if (context.req.path === "/health" || context.req.method === "OPTIONS") {
		await next();
		return;
	}

	assertAllowedOrigin(context);
	await next();
});

app.get("/health", (context) => context.json({ ok: true }));
app.get("/", previewResponse);
app.get("/preview", previewResponse);
app.get("/screenshot", (context) =>
	cachedScreenshotResponse({
		context,
		normalizedUrl: normalizedUrlFrom(context),
	}),
);

app.notFound((context) => context.json({ error: "Not found." }, 404));

app.onError((error, context) => {
	if (error instanceof RequestError) {
		return context.json({ error: error.message }, error.status);
	}
	console.error("Previewer request failed", error);
	return context.json({ error: "Internal server error." }, 500);
});

export default app;
