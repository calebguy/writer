"use client";

import CreateInput from "@/components/CreateInput";
import { LoadingRelic } from "@/components/LoadingRelic";
import { LoginPrompt } from "@/components/LoginPrompt";
import { NavDropdown } from "@/components/NavDropdown";
import { Dropdown, DropdownItem } from "@/components/dsl/Dropdown";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { Arrow } from "@/components/icons/Arrow";
import { Check } from "@/components/icons/Check";
import { Close } from "@/components/icons/Close";
import { ClosedEye } from "@/components/icons/ClosedEye";
import { Copy } from "@/components/icons/Copy";
import { Cursor } from "@/components/icons/Cursor";
import { Github } from "@/components/icons/Github";
import { Link as LinkIcon } from "@/components/icons/Link";
import { Lock } from "@/components/icons/Lock";
import { Logo } from "@/components/icons/Logo";
import { Plus } from "@/components/icons/Plus";
import { Save } from "@/components/icons/Save";
import { Undo } from "@/components/icons/Undo";
import { Unlock } from "@/components/icons/Unlock";
import { VerticalEllipses } from "@/components/icons/VerticalEllipses";
import Image from "next/image";

const secondaryGray = "dark:text-neutral-200 text-neutral-800";

const icons = [
	{ name: "Arrow", Component: Arrow },
	{ name: "Check", Component: Check },
	{ name: "Close", Component: Close },
	{ name: "ClosedEye", Component: ClosedEye },
	{ name: "Copy", Component: Copy },
	{ name: "Cursor", Component: Cursor },
	{ name: "Github", Component: Github },
	{ name: "Link", Component: LinkIcon },
	{ name: "Lock", Component: Lock },
	{ name: "Logo", Component: Logo },
	{ name: "Plus", Component: Plus },
	{ name: "Save", Component: Save },
	{ name: "Undo", Component: Undo },
	{ name: "Unlock", Component: Unlock },
	{ name: "VerticalEllipses", Component: VerticalEllipses },
];

const humanImages = Array.from(
	{ length: 32 },
	(_, i) => `/images/human/logo-${i + 1}.png`,
);

const relicImages = [
	"/images/relics/relic-1.png",
	"/images/relics/relic-2.png",
	"/images/relics/relic-3.png",
	"/images/relics/relic-4.png",
	"/images/relics/relic-5.png",
	"/images/relics/relic-6.png",
	"/images/relics/relic-7.png",
	"/images/relics/relic-8.png",
	"/images/relics/relic-9.png",
	"/images/relics/relic-10.png",
	"/images/relics/relic-11.png",
	"/images/relics/relic-12.png",
	"/images/relics/relic-13.png",
	"/images/relics/relic-14.png",
	"/images/relics/relic-15.png",
	"/images/relics/relic-16.png",
	"/images/relics/relic-17.png",
	"/images/relics/arrow-1.png",
	"/images/relics/computer-1.png",
	"/images/relics/exit-1.png",
	"/images/relics/frame-1.png",
	"/images/relics/globe-1.png",
	"/images/relics/moon-1.png",
	"/images/relics/moon-2.png",
	"/images/relics/moon-3.png",
	"/images/relics/splat-1.png",
];

const totemImages = Array.from(
	{ length: 16 },
	(_, i) => `/images/totem/totem-${i + 1}.png`,
);

function Section({
	title,
	children,
	description,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="mb-12">
			<h2 className="text-3xl font-serif italic text-primary mb-1">{title}</h2>
			{description && (
				<p className={`${secondaryGray} mb-4`}>{description}</p>
			)}
			<div className="bg-surface p-4">{children}</div>
		</section>
	);
}

function ImageGrid({
	srcs,
	columns = 8,
	size = 64,
}: {
	srcs: string[];
	columns?: number;
	size?: number;
}) {
	return (
		<div
			className="grid gap-3"
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${size + 24}px, 1fr))`,
			}}
		>
			{srcs.map((src) => {
				const label = src.split("/").pop()?.replace(".png", "") ?? src;
				return (
					<div
						key={src}
						className="flex flex-col items-center gap-1.5 p-2 border border-surface-raised bg-background"
					>
						<div
							className="flex items-center justify-center"
							style={{ width: size, height: size }}
						>
							<Image
								src={src}
								alt={label}
								width={size}
								height={size}
								className="object-contain dark:invert"
							/>
						</div>
						<code className={`text-xs font-mono ${secondaryGray} truncate w-full text-center`}>
							{label}
						</code>
					</div>
				);
			})}
		</div>
	);
}

export default function ComponentsPage() {
	return (
		<div className="max-w-5xl w-full mx-auto">
			<p className={`${secondaryGray} mb-8`}>
				A visual index of the components and image assets used across
				writer.place.
			</p>

			<Section
				title="Icons"
				description="SVG icons in @/components/icons. All accept standard SVG props."
			>
				<div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(96px,1fr))]">
					{icons.map(({ name, Component }) => (
						<div
							key={name}
							className="flex flex-col items-center gap-2 p-3 border border-surface-raised bg-background"
						>
							<div className="h-8 w-8 flex items-center justify-center text-primary">
								<Component className="w-6 h-6" />
							</div>
							<code className={`text-xs font-mono ${secondaryGray}`}>
								{name}
							</code>
						</div>
					))}
				</div>
			</Section>

			<Section
				title="Dropdown"
				description="Radix-based dropdown from @/components/dsl/Dropdown. Accepts any trigger and children of DropdownItem."
			>
				<div className="flex items-center gap-6">
					<Dropdown
						trigger={
							<span className="border border-surface-raised px-3 py-1.5 text-primary hover:bg-surface-raised">
								Open dropdown
							</span>
						}
					>
						<DropdownItem onClick={() => {}}>First</DropdownItem>
						<DropdownItem onClick={() => {}}>Second</DropdownItem>
						<DropdownItem onClick={() => {}}>Third</DropdownItem>
					</Dropdown>
					<code className={`text-xs font-mono ${secondaryGray}`}>
						{"<Dropdown trigger={…}>…</Dropdown>"}
					</code>
				</div>
			</Section>

			<Section
				title="NavDropdown"
				description="The app's main nav dropdown. Trigger is a relic image; contents adapt to auth state (sign in/out, theme toggles, migrate, color)."
			>
				<div className="flex items-center gap-6">
					<NavDropdown />
					<code className={`text-xs font-mono ${secondaryGray}`}>
						{"<NavDropdown />"}
					</code>
				</div>
			</Section>

			<Section
				title="CreateInput"
				description="MDX markdown editor used for creating writers and entries. Click the + to expand. onSubmit is a no-op here."
			>
				<div className="grid gap-2 grid-cols-1 min-[321px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
					<CreateInput
						placeholder="Demo input"
						onSubmit={async ({ markdown }) => {
							console.log("demo submit", markdown);
						}}
					/>
				</div>
			</Section>

			<Section
				title="LoadingRelic"
				description="Rotating mask of a random human logo. Used as an in-flight loader."
			>
				<div className="flex items-center gap-8 text-primary">
					<div className="flex flex-col items-center gap-2">
						<LoadingRelic size={24} />
						<code className={`text-xs font-mono ${secondaryGray}`}>size=24</code>
					</div>
					<div className="flex flex-col items-center gap-2">
						<LoadingRelic size={48} />
						<code className={`text-xs font-mono ${secondaryGray}`}>size=48</code>
					</div>
					<div className="flex flex-col items-center gap-2">
						<LoadingRelic size={96} />
						<code className={`text-xs font-mono ${secondaryGray}`}>size=96</code>
					</div>
				</div>
			</Section>

			<Section
				title="MobileBottomNav"
				description="The floating nav bar shown on small viewports for /home, /explore, /saved, and /writer routes. Long-press the home icon to reveal theme + account controls. Previewed here with preview prop — live behavior uses fixed positioning."
			>
				<div className="border border-surface-raised bg-background py-8">
					<MobileBottomNav preview />
				</div>
			</Section>

			<Section
				title="LoginPrompt"
				description="Shown on pages that require auth. Rotates through human logos based on the logo prop."
			>
				<div className="border border-surface-raised bg-background">
					<LoginPrompt toWhat="demo this component" logo={7} />
				</div>
			</Section>

			<Section
				title="Images — Human"
				description="public/images/human — 32 logos used for loaders, login prompts, and section dividers in docs."
			>
				<ImageGrid srcs={humanImages} size={56} />
			</Section>

			<Section
				title="Images — Relics"
				description="public/images/relics — object glyphs used in the nav dropdown trigger and theme toggles."
			>
				<ImageGrid srcs={relicImages} size={56} />
			</Section>

			<Section
				title="Images — Totem"
				description="public/images/totem — 16 totem illustrations."
			>
				<ImageGrid srcs={totemImages} size={80} />
			</Section>
		</div>
	);
}
