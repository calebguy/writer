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
						__html:
							"(function(){try{var t=localStorage.getItem('writer-theme');var m=(t==='light'||t==='dark'||t==='system')?t:'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=(m==='system')?(d?'dark':'light'):m;}catch(e){}})();",
					}}
				/>
				<div className="antialiased w-full grow flex flex-col px-4 pt-4 pb-2 font-serif max-w-7xl">
					<Providers initialLoggedIn={initialLoggedIn}>
						{children}
					</Providers>
				</div>
			</body>
		</html>
	);
}
