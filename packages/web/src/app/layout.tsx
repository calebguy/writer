import { Providers } from "@/components/Providers";
import { getAuthenticatedUser } from "@/utils/auth";
import { cn } from "@/utils/cn";
import { getUserColor } from "@/utils/getUserColor";
import { bytes32ToHexColor, hexToRGB } from "@/utils/utils";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import type { Hex } from "viem";
import { basicallyAMono, ltRemark } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
	title: "Writer",
	description: "Write for now, forever",
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
		const secondaryColor = rgb.map((c) => c - 100);
		//@ts-ignore
		colorStyle["--color-primary" as keyof CSSProperties] = rgb.join(" ");
		//@ts-ignore
		colorStyle["--color-secondary" as keyof CSSProperties] =
			secondaryColor.join(" ");
	}

	return (
		<html lang="en" style={colorStyle} className="h-full">
			<body className="flex justify-center h-full">
				<div
					className={cn(
						"antialiased w-full grow flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2 font-serif max-w-screen-xl",
						ltRemark.variable,
						basicallyAMono.variable,
					)}
				>
					<Providers initialColor={initialColor || undefined}>
						{children}
					</Providers>
				</div>
			</body>
		</html>
	);
}
