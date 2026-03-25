"use client";

import { useLogin } from "@privy-io/react-auth";
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

function useStarCounts(gridRef: React.RefObject<HTMLDivElement | null>) {
	const [sideCols, setSideCols] = useState(0);
	const [topRows, setTopRows] = useState(0);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		function calculate() {
			if (!gridRef.current) return;
			const styles = getComputedStyle(gridRef.current);
			const gap = Number.parseFloat(
				styles.getPropertyValue("--star-gap") || String(STAR_GAP_DEFAULT),
			);
			const starSize = Number.parseFloat(
				styles.getPropertyValue("--star-size") || String(STAR_SIZE),
			);
			const starSlot = starSize + gap;

			const gridHeight = gridRef.current.scrollHeight;
			const availableHeight = gridHeight - starSize * 2 - gap;
			setSideCols(Math.max(1, Math.ceil(availableHeight / starSlot)));

			const gridWidth = gridRef.current.clientWidth;
			const availableWidth = gridWidth - starSize * 2 - gap;
			setTopRows(Math.max(1, Math.floor(availableWidth / starSlot)));

			setReady(true);
		}

		calculate();

		const observer = new ResizeObserver(calculate);
		if (gridRef.current) observer.observe(gridRef.current);

		return () => observer.disconnect();
	}, [gridRef]);

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

const FOR_LINES = [
	"for you",
	"for me",
	"for artists",
	"for poets",
	"for non-writers",
	"for jotters",
	"for scribblers",
	"for dreamers",
	"for thinkers",
	"for overthinkers",
	"for the sleepless",
	"for the restless",
	"for diarists",
	"for journalists",
	"for people who journal but won't call it that",
	"for note-takers",
	"for list-makers",
	"for letter-writers",
	"for love-letter-writers",
	"for apology-drafters",
	"for the unsent message",
	"for 3am thoughts",
	"for shower arguments",
	"for the thing you'll forget by morning",
	"for students",
	"for dropouts",
	"for teachers",
	"for autodidacts",
	"for philosophers",
	"for armchair philosophers",
	"for actual armchair owners",
	"for novelists",
	"for aspiring novelists",
	"for people on chapter one for three years",
	"for bloggers",
	"for former bloggers",
	"for people who miss blogspot",
	"for lurkers",
	"for posters",
	"for reply guys",
	"for the chronically online",
	"for the intentionally offline",
	"for travelers",
	"for homebodies",
	"for commuters",
	"for the waiting room",
	"for the back of the lecture hall",
	"for lunch breaks",
	"for insomniacs",
	"for early risers",
	"for the caffeinated",
	"for the decaf curious",
	"for musicians",
	"for people who sing in the car",
	"for cooks who don't use recipes",
	"for programmers",
	"for designers",
	"for founders",
	"for people between things",
	"for the employed",
	"for the unemployed",
	"for the funemployed",
	"for introverts",
	"for extroverts who need to process",
	"for ambiverts",
	"for skeptics",
	"for believers",
	"for the spiritual but not religious",
	"for the religious but not spiritual",
	"for the confused",
	"for the certain",
	"for the temporarily certain",
	"for kids",
	"for adults",
	"for adults who feel like kids",
	"for your future self",
	"for your past self",
	"for the version of you that almost existed",
	"for complaints never filed",
	"for gratitude never expressed",
	"for the epiphany on the subway",
	"for the thing you overheard at the coffee shop",
	"for manifestos",
	"for grocery lists that became poems",
	"for poems that became grocery lists",
	"for the marginalia",
	"for the footnotes",
	"for the PS at the end",
	"for ghost stories",
	"for origin stories",
	"for the story you keep telling differently",
	"for conspiracies",
	"for confessions",
	"for the truth",
	"for the almost truth",
	"for the beautiful lie",
	"for therapists",
	"for people who can't afford therapists",
	"for people who are their own therapist",
	"for runners",
	"for people who run from things",
	"for people who run toward things",
	"for dog people",
	"for cat people",
	"for people who talk to their plants",
	"for twins",
	"for only children",
	"for middle children especially",
	"for grandparents",
	"for ancestors",
	"for descendants who haven't been born",
	"for the eulogy you hope someone writes",
	"for the toast at the wedding",
	"for the speech you gave in the mirror",
	"for vows",
	"for broken vows",
	"for renewed vows",
	"for new year's resolutions",
	"for february",
	"for the long weekend",
	"for the Sunday scaries",
	"for Monday mornings",
	"for Friday at 4:58pm",
	"for the gap year",
	"for the lost decade",
	"for the comeback",
	"for rough drafts",
	"for final drafts",
	"for drafts that are never final",
	"for the delete key",
	"for the undo button",
	"for the things you can't undo",
	"for permanence",
	"for impermanence",
	"for the space between",
	"for no one",
	"for everyone",
	"for public",
	"for private",
];

function ArtifactBar({ items }: { items: typeof BAR_1_ITEMS }) {
	return (
		<div className="flex items-center justify-center gap-3 md:gap-7 bg-primary p-6 md:py-[30px] md:px-10 rounded-2xl">
			{items.map((item, i) => (
				<Image
					key={`${item.src}-${String(i)}`}
					src={item.src}
					alt={item.alt}
					width={80}
					height={80}
					className={`w-[72px] h-[72px] md:w-[110px] md:h-[110px] object-contain ${
						i === 1 ? "hidden min-[480px]:block" : ""
					}`}
				/>
			))}
		</div>
	);
}

function ForLines() {
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
			className="flex flex-col items-center gap-4 font-serif italic text-[2.5rem] md:text-[4rem] text-center"
		>
			{FOR_LINES.map((line, i) => (
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
				data-index={FOR_LINES.length}
				data-for-line
				className="will-change-opacity leading-[1.1] italic mt-2"
				style={{
					opacity: visibleCount > FOR_LINES.length ? 1 : 0,
					transition: "opacity 0.8s ease",
					transitionDelay: "0.3s",
				}}
			>
				forever
			</div>
		</div>
	);
}

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
	const router = useRouter();
	const { login } = useLogin({
		onComplete: ({ wasAlreadyAuthenticated }) => {
			if (!wasAlreadyAuthenticated) {
				router.push("/home");
			}
		},
	});

	const gridRef = useRef<HTMLDivElement>(null);
	const { sideCols, topRows, ready } = useStarCounts(gridRef);

	return (
		<div
			data-landing-root
			className="fixed inset-0 light:bg-white dark:bg-black light:text-black dark:text-white overflow-x-hidden overflow-y-auto"
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

				<div className="flex flex-col items-center px-6 md:px-12">
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
										className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:opacity-50"
									>
										write,
									</Link>
								) : (
									<button
										type="button"
										className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:opacity-50"
										onClick={() => login()}
									>
										login,
									</button>
								)}
								<Link
									href="/explore"
									className="font-serif italic text-xl md:text-2xl bg-transparent border-none cursor-pointer transition-opacity duration-200 hover:opacity-50"
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

					<ForLines />

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
						className="light:text-black/40 dark:text-white/40 no-underline transition-colors duration-200 light:hover:text-black/70 dark:hover:text-white/70"
					>
						about
					</a>
					<a
						href="/docs"
						className="light:text-black/40 dark:text-white/40 no-underline transition-colors duration-200 light:hover:text-black/70 dark:hover:text-white/70"
					>
						docs
					</a>
				</span>
			</footer>
			</div>
		</div>
	);
}
