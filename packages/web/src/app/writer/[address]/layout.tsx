import { Footer } from "@/components/Footer";
import { WriterHeader } from "@/components/header/WriterHeader";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { ComposeHeaderActionsProvider } from "@/components/writer/ComposeHeaderActionsContext";
import { EntryLoadingProvider } from "@/utils/EntryLoadingContext";
import type { Metadata } from "next";
import { use } from "react";
import {
	getWriterTitle,
	sanitizeWriterTitle,
	writerSocialImageUrl,
} from "./metadata";

type WriterRouteParams = Promise<{ address: string }>;

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
	const imageUrl = writerSocialImageUrl(address);
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [{ url: imageUrl, alt: title }],
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
			<ComposeHeaderActionsProvider>
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
			</ComposeHeaderActionsProvider>
		</EntryLoadingProvider>
	);
}
