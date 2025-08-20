import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/utils/cn";
import { basicallyAMono, ltRemark } from "./fonts";
import { getAuthenticatedUser } from "@/utils/auth";
import { getUserColor } from "@/actions/getUserColor";
import type { Hex } from "viem";

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

	return (
		<html lang="en">
			<body>
				<div
					className={cn(
						"antialiased w-full grow flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2 font-serif",
						ltRemark.variable,
						basicallyAMono.variable,
					)}
				>
					<Providers initialColor={initialColor || undefined}>{children}</Providers>
				</div>
			</body>
		</html>
	);
}
