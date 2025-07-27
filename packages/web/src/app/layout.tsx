import { Providers } from "@/components/Providers";
import type { Metadata } from "next";
import "./globals.css";

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
				<div className="antialiased grow flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2">
					<Providers>{children}</Providers>
				</div>
			</body>
		</html>
	);
}
