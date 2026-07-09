import { env } from "@/utils/env";

const WRITER_SITE_ORIGIN = "https://www.writer.place";

export function sanitizeWriterTitle(input: string): string {
	return input
		.replace(/[#*_`~>\[\]\(\)!|\\]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function getWriterTitle(address: string): Promise<string | null> {
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

export function writerSocialImageUrl(address: string) {
	return `${WRITER_SITE_ORIGIN}/writer/${encodeURIComponent(
		address,
	)}/opengraph-image`;
}

export function entrySocialImageUrl(address: string, id: string) {
	return `${WRITER_SITE_ORIGIN}/writer/${encodeURIComponent(
		address,
	)}/${encodeURIComponent(id)}/opengraph-image`;
}
