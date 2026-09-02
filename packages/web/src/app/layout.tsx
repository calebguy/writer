import { Providers } from "@/components/Providers";
import { getAuthHint } from "@/utils/auth";
import { cn } from "@/utils/cn";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { OG_IMAGE_URL } from "utils/constants";
import { diatypeRoundedMono, ltRemark } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
	title: "Writer",
	description: "Write today, forever",
	openGraph: {
		title: "Writer",
		description: "Write today, forever",
		url: "https://writer.place",
		type: "website",
		images: [
			{
				url: OG_IMAGE_URL,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Writer",
		description: "Write today, forever",
		images: [
			{
				url: OG_IMAGE_URL,
			},
		],
	},
};

const THEME_BOOTSTRAP_SCRIPT = `(() => {
	try {
		const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
		const root = document.documentElement;
		root.dataset.themeBootstrapping = "true";
		const clearThemeBootstrapping = () => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					delete root.dataset.themeBootstrapping;
				});
			});
		};
		const parseHexColor = (value) => {
			const match = value?.match(/^#?([a-fA-F0-9]{6})$/);
			if (!match) return null;
			const hex = match[1];
			return [0, 2, 4].map((offset) =>
				Number.parseInt(hex.slice(offset, offset + 2), 16),
			);
		};
		const setRgbChannels = (name, value) =>
			root.style.setProperty(name, value.join(" "));
		const primary = parseHexColor(localStorage.getItem("writer-primary-color"));
		if (primary) {
			setRgbChannels("--color-primary", primary);
			const primaryLuminance =
				0.299 * primary[0] + 0.587 * primary[1] + 0.114 * primary[2];
			const secondaryOffset = primaryLuminance > 128 ? -125 : 75;
			setRgbChannels(
				"--color-secondary",
				primary.map((channel) =>
					Math.min(255, Math.max(0, channel + secondaryOffset)),
				),
			);
		}

		const background = parseHexColor(localStorage.getItem("writer-custom-background-color"));
		if (background) {
			const normalized = background.map((channel) => {
				const value = channel / 255;
				return value <= 0.03928
					? value / 12.92
					: ((value + 0.055) / 1.055) ** 2.4;
			});
			const luminance =
				0.2126 * normalized[0] +
				0.7152 * normalized[1] +
				0.0722 * normalized[2];
			const resolved = luminance < 0.45 ? "dark" : "light";
			const foreground = resolved === "dark" ? [255, 255, 255] : [0, 0, 0];
			const mix = (from, to, amount) =>
				from.map((channel, index) =>
					Math.min(255, Math.max(0, Math.round(channel + (to[index] - channel) * amount))),
				);
			const setColor = (name, value) =>
				root.style.setProperty(name, "rgb(" + value.join(" ") + ")");
			const dark = resolved === "dark";
			root.dataset.theme = resolved;
			root.dataset.themeMode = "custom";
			setColor("--color-background", background);
			setColor("--color-surface", mix(background, foreground, dark ? 0.08 : 0.06));
			setColor("--color-surface-raised", mix(background, foreground, dark ? 0.18 : 0.12));
			setColor("--color-surface-overlay", mix(background, foreground, dark ? 0.12 : 0.08));
			setColor("--color-foreground", foreground);
			setColor("--color-muted", mix(foreground, background, 0.28));
			setColor("--color-muted-strong", mix(foreground, background, 0.16));
			setColor("--color-border", mix(background, foreground, dark ? 0.2 : 0.18));
			setColor("--color-border-strong", mix(background, foreground, dark ? 0.32 : 0.28));
			clearThemeBootstrapping();
			return;
		}
		const resolved = prefersDark ? "dark" : "light";
		root.dataset.theme = resolved;
		root.dataset.themeMode = "system";
		clearThemeBootstrapping();
	} catch {}
})();`;

const THEME_BOOTSTRAP_STYLE = `
.text-primary{color:rgb(var(--color-primary))}
.text-secondary{color:rgb(var(--color-secondary))}
:root[data-theme-bootstrapping] *,
:root[data-theme-bootstrapping] *::before,
:root[data-theme-bootstrapping] *::after{transition:none!important}
`;

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [initialLoggedIn, headerList] = await Promise.all([
		getAuthHint(),
		headers(),
	]);
	const nonce = headerList.get("x-nonce") ?? undefined;

	return (
		<html lang="en" className="min-h-dvh" suppressHydrationWarning>
			<body
				className={cn(
					"flex justify-center",
					ltRemark.variable,
					diatypeRoundedMono.variable,
				)}
			>
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: THEME_BOOTSTRAP_SCRIPT,
					}}
				/>
				<style
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: THEME_BOOTSTRAP_STYLE,
					}}
				/>
				<div className="antialiased w-full grow flex flex-col px-4 pt-4 pb-2 font-serif max-w-7xl">
					<Providers initialLoggedIn={initialLoggedIn}>{children}</Providers>
				</div>
			</body>
		</html>
	);
}
