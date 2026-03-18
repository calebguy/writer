"use client";

import { useLogin } from "@privy-io/react-auth";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const STAR_IMAGE = "/images/relics/relic-5.png";

const BAR_1_ITEMS = [
	{ src: "/images/human/logo-1.png", alt: "figurine" },
	{ src: "/images/relics/relic-10.png", alt: "sun relic" },
	{ src: "/images/human/logo-2.png", alt: "figurine" },
];

const BAR_2_ITEMS = [
	{ src: "/images/human/logo-3.png", alt: "figurine" },
	{ src: "/images/relics/relic-1.png", alt: "orb relic" },
	{ src: "/images/human/logo-4.png", alt: "figurine" },
];

const BAR_3_ITEMS = [
	{ src: "/images/human/logo-7.png", alt: "figurine" },
	{ src: "/images/relics/relic-13.png", alt: "totem" },
	{ src: "/images/human/logo-9.png", alt: "figurine" },
];

const FOR_LINES = [
	"for you",
	"for me",
	"for artists",
	"for poets",
	"for non-writers",
	"for jotters",
	"for scribblers",
	"for public",
	"for private",
];

const STAR_COLS = 20;
const STAR_ROWS_HORIZONTAL = 8;

function StarImage() {
	return (
		<Image
			src={STAR_IMAGE}
			alt=""
			width={88}
			height={88}
			className="landing-star"
			unoptimized
		/>
	);
}

function ArtifactBar({ items }: { items: typeof BAR_1_ITEMS }) {
	return (
		<div className="landing-bar">
			{items.map((item, i) => (
				<Image
					key={i}
					src={item.src}
					alt={item.alt}
					width={80}
					height={80}
					className="landing-bar-artifact"
				/>
			))}
		</div>
	);
}

function ForLines() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(0);

	useEffect(() => {
		const lineEls = containerRef.current?.querySelectorAll(".for-line");
		if (!lineEls) return;

		const scrollRoot = containerRef.current?.closest(".landing-root");

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const index = Number((entry.target as HTMLElement).dataset.index);
						setVisibleCount((prev) => Math.max(prev, index + 1));
						observer.unobserve(entry.target);
					}
				}
			},
			{
				threshold: 0.3,
				root: scrollRoot || null,
			},
		);

		for (const el of lineEls) {
			observer.observe(el);
		}

		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className="landing-for-section">
			{FOR_LINES.map((line, i) => (
				<div
					key={line}
					data-index={i}
					className="for-line"
					style={{
						opacity: i < visibleCount ? 1 : 0,
						transform: i < visibleCount ? "translateY(0)" : "translateY(12px)",
						transition: "opacity 0.6s ease, transform 0.6s ease",
						transitionDelay: `${(i - (visibleCount - 1)) * 0.05}s`,
					}}
				>
					{line}
				</div>
			))}
			<div
				data-index={FOR_LINES.length}
				className="for-line for-line-forever"
				style={{
					opacity: visibleCount > FOR_LINES.length ? 1 : 0,
					transform:
						visibleCount > FOR_LINES.length
							? "translateY(0)"
							: "translateY(12px)",
					transition: "opacity 0.8s ease, transform 0.8s ease",
					transitionDelay: "0.3s",
				}}
			>
				forever
			</div>
		</div>
	);
}

export function LandingPage() {
	const { login } = useLogin({
		onComplete: () => {
			window.location.href = "/home";
		},
	});

	return (
		<div className="landing-root">
			<div className="landing-grid">
				{/* Row 1: corner + top stars + corner */}
				<div className="landing-border-corner">
					<StarImage />
				</div>
				<div className="landing-border-top">
					{Array.from({ length: STAR_ROWS_HORIZONTAL }).map((_, i) => (
						<StarImage key={`top-${i}`} />
					))}
				</div>
				<div className="landing-border-corner">
					<StarImage />
				</div>

				{/* Row 2: left stars + content + right stars */}
				<div className="landing-border-left">
					{Array.from({ length: STAR_COLS }).map((_, i) => (
						<StarImage key={`left-${i}`} />
					))}
				</div>

				<div className="landing-content">
					{/* First viewport */}
					<div className="landing-hero">
						<ArtifactBar items={BAR_1_ITEMS} />

						<div className="landing-wordmark">Writer</div>
						<button
							type="button"
							className="landing-open"
							onClick={() => login()}
						>
							open
						</button>
					</div>

					{/* Scroll reveal section */}
					<div className="landing-scroll-section">
						<ArtifactBar items={BAR_2_ITEMS} />
						<ForLines />
						<ArtifactBar items={BAR_3_ITEMS} />
					</div>
				</div>

				<div className="landing-border-right">
					{Array.from({ length: STAR_COLS }).map((_, i) => (
						<StarImage key={`right-${i}`} />
					))}
				</div>

				{/* Row 3: corner + bottom stars + corner */}
				<div className="landing-border-corner">
					<StarImage />
				</div>
				<div className="landing-border-bottom">
					{Array.from({ length: STAR_ROWS_HORIZONTAL }).map((_, i) => (
						<StarImage key={`bottom-${i}`} />
					))}
				</div>
				<div className="landing-border-corner">
					<StarImage />
				</div>
			</div>

			{/* Footer — below the border */}
			<footer className="landing-footer">
				<span className="landing-footer-tagline">write today, forever</span>
				<span className="landing-footer-url">writer.place</span>
				<span className="landing-footer-links">
					<a href="/about">about</a>
					<a href="/docs">docs</a>
				</span>
			</footer>
		</div>
	);
}
