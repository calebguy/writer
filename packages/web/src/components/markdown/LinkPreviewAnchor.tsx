"use client";

import { env } from "@/utils/env";
import { type MouseEvent, type ReactNode, useRef, useState } from "react";

const HOVER_DELAY_MS = 300;
const CARD_WIDTH = 320;
const CARD_GUTTER = 16;
const CARD_TOP_OFFSET = 14;
const MAX_CACHED_PREVIEWS = 40;
const previewCache = new Map<string, LinkPreview>();

interface LinkPreviewAnchorProps {
	href?: string;
	children: ReactNode;
}

interface PreviewResponse {
	url: string;
	screenshotUrl: string;
	cacheSeconds: number;
}

interface LinkPreview {
	url: string;
	imageUrl: string;
}

interface PreviewPosition {
	left: number;
	top: number;
}

class PreviewRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PreviewRequestError";
	}
}

function externalHttpUrl(href: string | undefined) {
	if (!href) return null;
	try {
		const url = new URL(href);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.toString();
	} catch {
		return null;
	}
}

function previewEndpoint(targetUrl: string) {
	const endpoint = new URL("/preview", env.NEXT_PUBLIC_PREVIEWER_URL);
	endpoint.searchParams.set("url", targetUrl);
	return endpoint.toString();
}

function unavailableMessage(response: Response) {
	const retryAfter = Number(response.headers.get("retry-after"));
	if (
		response.status === 429 &&
		Number.isFinite(retryAfter) &&
		retryAfter > 0
	) {
		return `Preview rate limited. Try again in ${retryAfter}s.`;
	}
	if (response.status === 429) return "Preview rate limited. Try again soon.";
	return "Preview unavailable.";
}

function cachePreview(targetUrl: string, preview: LinkPreview) {
	previewCache.set(targetUrl, preview);
	if (previewCache.size <= MAX_CACHED_PREVIEWS) return;

	const oldestTargetUrl = previewCache.keys().next().value;
	if (!oldestTargetUrl) return;
	const oldestPreview = previewCache.get(oldestTargetUrl);
	if (oldestPreview?.imageUrl.startsWith("blob:")) {
		URL.revokeObjectURL(oldestPreview.imageUrl);
	}
	previewCache.delete(oldestTargetUrl);
}

async function loadPreview(targetUrl: string, signal: AbortSignal) {
	const cached = previewCache.get(targetUrl);
	if (cached) return cached;

	const previewResponse = await fetch(previewEndpoint(targetUrl), { signal });
	if (!previewResponse.ok) {
		throw new PreviewRequestError(unavailableMessage(previewResponse));
	}

	const preview = (await previewResponse.json()) as PreviewResponse;
	const screenshotResponse = await fetch(preview.screenshotUrl, { signal });
	if (!screenshotResponse.ok) {
		throw new PreviewRequestError(unavailableMessage(screenshotResponse));
	}

	const imageBlob = await screenshotResponse.blob();
	const linkPreview = {
		url: preview.url,
		imageUrl: URL.createObjectURL(imageBlob),
	};
	cachePreview(targetUrl, linkPreview);
	return linkPreview;
}

function previewPosition(event: MouseEvent<HTMLAnchorElement>) {
	const left = Math.min(
		event.clientX,
		window.innerWidth - CARD_WIDTH - CARD_GUTTER,
	);
	return {
		left: Math.max(CARD_GUTTER, left),
		top: event.clientY + CARD_TOP_OFFSET,
	};
}

function PreviewCard({ preview }: { preview: LinkPreview }) {
	const domain = new URL(preview.url).hostname.replace(/^www\./, "");

	return (
		<div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
			<div className="aspect-[3/2] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
				<img
					src={preview.imageUrl}
					alt=""
					className="!h-full !w-full !max-w-none !max-h-none !object-cover !object-left-top"
					decoding="async"
				/>
			</div>
			<div className="border-t border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
				{domain}
			</div>
		</div>
	);
}

function PreviewShell({
	children,
	position,
}: {
	children: ReactNode;
	position: PreviewPosition;
}) {
	return (
		<span
			className="pointer-events-auto fixed z-50 block"
			style={{ left: position.left, top: position.top, width: CARD_WIDTH }}
		>
			{children}
		</span>
	);
}
export function LinkPreviewAnchor({ href, children }: LinkPreviewAnchorProps) {
	const [preview, setPreview] = useState<LinkPreview | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState<PreviewPosition | null>(null);
	const hoverTimer = useRef<number | null>(null);
	const abortController = useRef<AbortController | null>(null);
	const targetUrl = externalHttpUrl(href);

	function clearPendingWork() {
		if (hoverTimer.current !== null) {
			window.clearTimeout(hoverTimer.current);
			hoverTimer.current = null;
		}
		abortController.current?.abort();
		abortController.current = null;
	}

	function openPreview(event: MouseEvent<HTMLAnchorElement>) {
		const canHover = window.matchMedia(
			"(hover: hover) and (pointer: fine)",
		).matches;
		if (!targetUrl || !canHover) return;
		setPosition(previewPosition(event));
		setPreview(null);
		setIsOpen(true);

		const cached = previewCache.get(targetUrl);
		if (cached) {
			setPreview(cached);
			return;
		}

		clearPendingWork();
		hoverTimer.current = window.setTimeout(() => {
			const controller = new AbortController();
			abortController.current = controller;
			void loadPreview(targetUrl, controller.signal)
				.then((nextPreview) => {
					setPreview(nextPreview);
				})
				.catch(() => undefined);
		}, HOVER_DELAY_MS);
	}

	function closePreview() {
		clearPendingWork();
		setIsOpen(false);
	}

	return (
		<span className="relative inline" onMouseLeave={closePreview}>
			<a
				href={href}
				target="_blank"
				rel="noreferrer noopener"
				onMouseEnter={openPreview}
			>
				{children}
			</a>
			{targetUrl && isOpen && position && preview && (
				<PreviewShell position={position}>
					<PreviewCard preview={preview} />
				</PreviewShell>
			)}
		</span>
	);
}
