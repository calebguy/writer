import { ImageResponse } from "next/og";
import { getWriterTitle, sanitizeWriterTitle } from "./metadata";

export const runtime = "edge";
export const alt = "Writer Place";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";
export const revalidate = 60;

const OG_BACKGROUND_URL = "https://www.writer.place/images/OG.png";
const TITLE_FONT_SIZE = 108;
const LONG_TITLE_FONT_SIZE = 88;
const EXTRA_LONG_TITLE_FONT_SIZE = 70;

const ltRemarkRegular = fetch(
	new URL("../../fonts/lt-remark/LTRemark-Regular.otf", import.meta.url),
).then((response) => response.arrayBuffer());

function titleFontSize(title: string) {
	if (title.length > 80) return EXTRA_LONG_TITLE_FONT_SIZE;
	if (title.length > 44) return LONG_TITLE_FONT_SIZE;
	return TITLE_FONT_SIZE;
}

export default async function OpenGraphImage({
	params,
}: {
	params: Promise<{ address: string }>;
}) {
	const { address } = await params;
	const rawTitle = await getWriterTitle(address);
	const title = rawTitle ? sanitizeWriterTitle(rawTitle) : "Writer";
	const displayTitle = title.length > 0 ? title : "Writer";
	const fontData = await ltRemarkRegular;

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "white",
				color: "black",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
			}}
		>
			<img
				alt=""
				src={OG_BACKGROUND_URL}
				style={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 210,
					top: 180,
					width: 780,
					height: 270,
					background: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "0 24px",
				}}
			>
				<div
					style={{
						maxWidth: 760,
						fontFamily: "LTRemark",
						fontSize: titleFontSize(displayTitle),
						fontWeight: 400,
						letterSpacing: "-0.035em",
						lineHeight: 0.95,
						textAlign: "center",
						whiteSpace: "pre-wrap",
						overflowWrap: "break-word",
					}}
				>
					{displayTitle}
				</div>
			</div>
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 108,
					display: "flex",
					justifyContent: "center",
					fontFamily: "LTRemark",
					fontSize: 26,
					color: "#e5e5e5",
				}}
			>
				writer.place
			</div>
		</div>,
		{
			...size,
			fonts: [
				{
					name: "LTRemark",
					data: fontData,
					weight: 400,
					style: "normal",
				},
			],
		},
	);
}
