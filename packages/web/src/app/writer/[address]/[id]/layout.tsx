import type { Metadata } from "next";
import {
	entrySocialImageUrl,
	getWriterTitle,
	sanitizeWriterTitle,
} from "../metadata";

type EntryRouteParams = Promise<{ address: string; id: string }>;

export async function generateMetadata({
	params,
}: {
	params: EntryRouteParams;
}): Promise<Metadata> {
	const { address, id } = await params;
	const rawWriterTitle = await getWriterTitle(address);
	const writerTitle = rawWriterTitle
		? sanitizeWriterTitle(rawWriterTitle)
		: null;
	if (!writerTitle) {
		return {};
	}

	const entryLabel = `entry ${id}`;
	const title = `${entryLabel} · ${writerTitle}`;
	const description = `Read ${entryLabel} from ${writerTitle} on Writer`;
	const imageUrl = entrySocialImageUrl(address, id);

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

export default function EntryLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return children;
}
