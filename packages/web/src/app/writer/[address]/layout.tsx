import { Footer } from "@/components/Footer";
import { WriterHeader } from "@/components/header/WriterHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { CreateEntryDrawerProvider } from "@/components/writer/CreateEntryDrawerContext";
import { EntryLoadingProvider } from "@/utils/EntryLoadingContext";
import { env } from "@/utils/env";
import type { Metadata } from "next";
import { use } from "react";
import { OG_IMAGE_URL } from "utils/constants";

type WriterRouteParams = Promise<{ address: string }>;

function sanitizeWriterTitle(input: string): string {
	return (
		input
			// Remove common markdown punctuation.
			.replace(/[#*_`~>\[\]\(\)!|\\]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	);
}

async function getWriterTitle(address: string): Promise<string | null> {
	try {
		const response = await fetch(
			`${env.NEXT_PUBLIC_BASE_URL}/writer/${encodeURIComponent(address)}`,
			{
				next: { revalidate: 60 },
			},
		);
		if (!response.ok) {
			return null;
		}
		const data = (await response.json()) as {
			writer?: { title?: string };
		};
		return data.writer?.title ?? null;
	} catch {
		return null;
	}
}

export async function generateMetadata({
	params,
}: {
	params: WriterRouteParams;
}): Promise<Metadata> {
	const { address } = await params;
	const rawWriterTitle = await getWriterTitle(address);
	const writerTitle = rawWriterTitle
		? sanitizeWriterTitle(rawWriterTitle)
		: null;
	if (!writerTitle) {
		return {};
	}

	const title = writerTitle;
	const description = `Read ${writerTitle} on Writer`;
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: OG_IMAGE_URL }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [OG_IMAGE_URL],
		},
	};
}

export default function Layout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode;
	params: WriterRouteParams;
}>) {
	const { address } = use(params);
	return (
		<EntryLoadingProvider>
			<CreateEntryDrawerProvider>
				<div className="flex flex-col grow min-h-0">
					<div className="mb-4 shrink-0">
						<WriterHeader address={address} />
					</div>
					<div className="grow flex flex-col relative min-h-0 overflow-auto">
						{children}
					</div>
				</div>
				<Footer />
				<MobileBottomNav />
			</CreateEntryDrawerProvider>
		</EntryLoadingProvider>
	);
}
