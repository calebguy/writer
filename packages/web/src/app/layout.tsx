import { Providers } from "@/components/Providers";
import { getAuthenticatedUser } from "@/utils/auth";
import { cn } from "@/utils/cn";
import { getUserColor } from "@/utils/getUserColor";
import { bytes32ToHexColor, getSecondaryColor, hexToRGB } from "@/utils/utils";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { OG_IMAGE_URL } from "utils/constants";
import type { Hex } from "viem";
import { diatypeRoundedMono, ltRemark } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
	title: "Writer",
	description: "Write for now, forever",
	openGraph: {
		title: "Writer",
		description: "Write for now, forever",
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
		description: "Write for now, forever",
		images: [
			{
				url: OG_IMAGE_URL,
			},
		],
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getAuthenticatedUser();
	let initialColor: string | null = null;

	if (user?.wallet?.address) {
		try {
			initialColor = await getUserColor(user.wallet.address as Hex);
		} catch (error) {
			console.warn("Failed to fetch user color in layout:", error);
		}
	}
	const colorStyle: React.CSSProperties = {};
	if (initialColor) {
		const rgb = hexToRGB(bytes32ToHexColor(initialColor));
		const secondaryColor = getSecondaryColor(rgb);
		//@ts-ignore
		colorStyle["--color-primary" as keyof CSSProperties] = rgb.join(" ");
		//@ts-ignore
		colorStyle["--color-secondary" as keyof CSSProperties] =
			secondaryColor.join(" ");
	}

	return (
		<html
			lang="en"
			style={colorStyle}
			className="min-h-dvh"
			suppressHydrationWarning
		>
			<body
				className={cn(
					"flex justify-center",
					ltRemark.variable,
					diatypeRoundedMono.variable,
				)}
			>
				<script
					dangerouslySetInnerHTML={{
						__html:
							"(function(){try{var t=localStorage.getItem('writer-theme');var m=(t==='light'||t==='dark'||t==='system')?t:'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=(m==='system')?(d?'dark':'light'):m;}catch(e){}})();",
					}}
				/>
				<div className="antialiased w-full grow flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2 font-serif max-w-7xl">
					<Providers initialColor={initialColor || undefined}>
						{children}
					</Providers>
				</div>
			</body>
		</html>
	);
}
