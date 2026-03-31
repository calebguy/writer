"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const STAR_IMAGE = "/images/relics/relic-5.png";
const STAR_SIZE = 44;
const STAR_GAP_DEFAULT = 80;

function StarImage() {
	return (
		<Image
			src={STAR_IMAGE}
			alt=""
			width={88}
			height={88}
			className="w-(--star-size) h-(--star-size) opacity-90 shrink-0 dark:invert"
			unoptimized
		/>
	);
}

function useStarCounts(
	gridRef: React.RefObject<HTMLDivElement | null>,
	contentRef: React.RefObject<HTMLDivElement | null>,
) {
	const [sideCols, setSideCols] = useState(0);
	const [topRows, setTopRows] = useState(0);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		function calculate() {
			if (!gridRef.current || !contentRef.current) return;
			const styles = getComputedStyle(gridRef.current);
			const gap = Number.parseFloat(
				styles.getPropertyValue("--star-gap") || String(STAR_GAP_DEFAULT),
			);
			const starSize = Number.parseFloat(
				styles.getPropertyValue("--star-size") || String(STAR_SIZE),
			);
			const starSlot = starSize + gap;

			const contentHeight = contentRef.current.scrollHeight;
			const availableHeight = contentHeight - starSize * 2 - gap;
			setSideCols(Math.max(1, Math.ceil(availableHeight / starSlot)));

			const gridWidth = gridRef.current.clientWidth;
			const availableWidth = gridWidth - starSize * 2 - gap;
			setTopRows(Math.max(1, Math.floor(availableWidth / starSlot)));

			setReady(true);
		}

		calculate();

		const observer = new ResizeObserver(calculate);
		if (contentRef.current) observer.observe(contentRef.current);
		if (gridRef.current) observer.observe(gridRef.current);

		return () => observer.disconnect();
	}, [gridRef, contentRef]);

	return { sideCols, topRows, ready };
}

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
	{ src: "/images/relics/relic-13.png", alt: "squiggle relic" },
	{ src: "/images/human/logo-9.png", alt: "figurine" },
];

// Extra bars shown only on mobile to fill the hero
const BAR_MOBILE_1_ITEMS = [
	{ src: "/images/human/logo-5.png", alt: "figurine" },
	{ src: "/images/relics/relic-11.png", alt: "relic pressed" },
	{ src: "/images/human/logo-6.png", alt: "figurine" },
];

const BAR_MOBILE_2_ITEMS = [
	{ src: "/images/human/logo-8.png", alt: "figurine" },
	{ src: "/images/relics/relic-12.png", alt: "relic squaggle" },
	{ src: "/images/human/logo-10.png", alt: "figurine" },
];

function ArtifactBar({ items }: { items: typeof BAR_1_ITEMS }) {
	return (
		<div className="flex items-center justify-center gap-3 md:gap-7 bg-primary p-6 md:py-[30px] md:px-10 rounded-2xl">
			{items.map((item, i) => (
				<Image
					key={`${item.src}-${String(i)}`}
					src={item.src}
					alt={item.alt}
					width={500}
					height={500}
					className={`w-[72px] h-[72px] md:w-[110px] md:h-[110px] object-contain ${
						i === 1 ? "hidden min-[480px]:block" : ""
					}`}
				/>
			))}
		</div>
	);
}

function ForLines({ lines }: { lines: string[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(0);

	useEffect(() => {
		const lineEls = containerRef.current?.querySelectorAll("[data-for-line]");
		if (!lineEls) return;

		const scrollRoot = containerRef.current?.closest("[data-landing-root]");

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
		<div
			ref={containerRef}
			className="flex flex-col items-center gap-4 font-serif italic text-[2.5rem] md:text-[3.5rem] text-center"
		>
			{lines.map((line, i) => (
				<div
					key={line}
					data-index={i}
					data-for-line
					className="will-change-opacity leading-[1.1]"
					style={{
						opacity: i < visibleCount ? 1 : 0,
						transition: "opacity 0.6s ease",
						transitionDelay: `${(i - (visibleCount - 1)) * 0.05}s`,
					}}
				>
					{line}
				</div>
			))}
			<div
				data-index={lines.length}
				data-for-line
				className="will-change-opacity leading-[1.1] italic mt-2"
				style={{
					opacity: visibleCount > lines.length ? 1 : 0,
					transition: "opacity 0.8s ease",
					transitionDelay: "0.3s",
				}}
			>
				forever
			</div>
		</div>
	);
}

export function LandingPage({
	isLoggedIn: initialLoggedIn = false,
	forLines,
}: { isLoggedIn?: boolean; forLines: string[] }) {
	const router = useRouter();
	const { ready: privyReady, authenticated } = usePrivy();
	const isLoggedIn = privyReady ? authenticated : initialLoggedIn;
	const { login } = useLogin({
		onComplete: ({ wasAlreadyAuthenticated }) => {
			if (!wasAlreadyAuthenticated) {
				router.push("/home");
			}
		},
	});

	const gridRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const { sideCols, topRows, ready } = useStarCounts(gridRef, contentRef);

	return (
		<div
			data-landing-root
			className="fixed inset-0 light:bg-white dark:bg-neutral-900 light:text-black dark:text-white overflow-x-hidden overflow-y-auto"
		>
			<div className="max-w-7xl mx-auto w-full">
				<div
					className="landing-grid opacity-0 data-[ready=true]:opacity-100 transition-opacity duration-300 w-full"
					ref={gridRef}
					data-ready={ready}
				>
					{/* Row 1: corner + top + corner */}
					<div className="flex items-center justify-center opacity-90">
						<StarImage />
					</div>
					<div className="flex justify-center items-center gap-(--star-gap)">
						{Array.from({ length: topRows }).map((_, i) => (
							<StarImage key={`top-${String(i)}`} />
						))}
					</div>
					<div className="flex items-center justify-center opacity-90">
						<StarImage />
					</div>

					{/* Row 2: left + content + right */}
					<div className="flex flex-col justify-start items-center gap-(--star-gap) py-[calc(var(--star-gap)/2)]">
						{Array.from({ length: sideCols }).map((_, i) => (
							<StarImage key={`left-${String(i)}`} />
						))}
					</div>

					<div
						ref={contentRef}
						className="flex flex-col items-center px-6 md:px-12"
					>
						{/* First viewport */}
						<div className="min-h-dvh flex flex-col items-center justify-between pt-[120px] pb-20 md:pb-[120px] gap-6 md:gap-8">
							<div className="flex flex-col items-center gap-4">
								<ArtifactBar items={BAR_1_ITEMS} />
								<div className="block md:hidden">
									<ArtifactBar items={BAR_MOBILE_1_ITEMS} />
								</div>
								<div className="block md:hidden">
									<ArtifactBar items={BAR_MOBILE_2_ITEMS} />
								</div>
							</div>

							<div className="flex flex-col items-center justify-center gap-6 md:gap-8 flex-1">
								<div className="font-serif text-[4.5rem] md:text-[7rem] leading-none text-center">
									Writer
								</div>
								<div className="flex flex-col sm:flex-row items-center sm:gap-1">
									{isLoggedIn ? (
										<Link
											href="/home"
											className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:text-primary"
										>
											write,
										</Link>
									) : (
										<button
											type="button"
											className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:text-primary"
											onClick={() => login()}
										>
											login,
										</button>
									)}
									<Link
										href="/explore"
										className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:text-primary"
									>
										explore
									</Link>
								</div>
							</div>
						</div>

						<div className="h-[120px]" />

						{/* Scroll reveal section */}
						<ArtifactBar items={BAR_2_ITEMS} />

						<div className="h-[120px]" />

						<ForLines lines={forLines} />

						<div className="h-[120px]" />

						<ArtifactBar items={BAR_3_ITEMS} />

						<div className="h-[120px]" />
					</div>

					<div className="flex flex-col justify-start items-center gap-(--star-gap) py-[calc(var(--star-gap)/2)]">
						{Array.from({ length: sideCols }).map((_, i) => (
							<StarImage key={`right-${String(i)}`} />
						))}
					</div>

					{/* Row 3: corner + bottom + corner */}
					<div className="flex items-center justify-center opacity-90">
						<StarImage />
					</div>
					<div className="flex justify-center items-center gap-(--star-gap)">
						{Array.from({ length: topRows }).map((_, i) => (
							<StarImage key={`bottom-${String(i)}`} />
						))}
					</div>
					<div className="flex items-center justify-center opacity-90">
						<StarImage />
					</div>
				</div>

				{/* Footer — below the border */}
				<footer className="flex justify-between items-end w-full px-4 pb-3 pt-2 font-serif text-[0.9rem] md:text-[1.15rem] light:text-black/40 dark:text-white/40 mt-[18px]">
					<span className="flex-1 text-left">writer.place</span>
					<span className="flex-1 text-center">write today, forever</span>
					<span className="flex-1 text-right flex justify-end gap-3">
						<a
							href="/about"
							className="light:text-black/40 dark:text-white/40 no-underline hover:text-primary"
						>
							about
						</a>
						<a
							href="/docs"
							className="light:text-black/40 dark:text-white/40 no-underline hover:text-primary"
						>
							docs
						</a>
					</span>
				</footer>
			</div>
		</div>
	);
}
