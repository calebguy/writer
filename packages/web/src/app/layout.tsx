import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/utils/cn";
import { basicallyAMono, ltRemark } from "./fonts";

export const metadata: Metadata = {
	title: "Writer",
	description: "Write for now, forever",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
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
					<Providers>{children}</Providers>
				</div>
			</body>
		</html>
	);
}
