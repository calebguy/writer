import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Writer";
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = "image/png";
export const revalidate = 60;

const OG_BACKGROUND_URL = "https://www.writer.place/images/OG.png";

const ltRemarkRegular = fetch(
	new URL("./fonts/lt-remark/LTRemark-Regular.otf", import.meta.url),
).then((response) => response.arrayBuffer());

export default async function OpenGraphImage() {
	const fontData = await ltRemarkRegular;

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				background: "white",
				display: "flex",
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
					left: 0,
					right: 0,
					bottom: 108,
					display: "flex",
					justifyContent: "center",
					fontFamily: "LTRemark",
					fontSize: 26,
					color: "#a1a1a1",
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
