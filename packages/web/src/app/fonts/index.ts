import localFont from "next/font/local";

export const ltRemark = localFont({
	variable: "--font-lt-remark",
	src: [
		{
			path: "./lt-remark/LTRemark-Regular.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "./lt-remark/LTRemark-Italic.woff2",
			weight: "400",
			style: "italic",
		},
		{
			path: "./lt-remark/LTRemark-Bold.woff2",
			weight: "700",
			style: "normal",
		},
		{
			path: "./lt-remark/LTRemark-BoldItalic.woff2",
			weight: "700",
			style: "italic",
		},
		{
			path: "./lt-remark/LTRemark-Black.woff2",
			weight: "900",
			style: "normal",
		},
		{
			path: "./lt-remark/LTRemark-BlackItalic.woff2",
			weight: "900",
			style: "italic",
		},
	],
});

export const basicallyAMono = localFont({
	variable: "--font-basically-a-mono",
	src: [
		{
			path: "./basically-a-mono/BasicallyAMono-Thin.woff2",
			weight: "100",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-ExtraLight.woff2",
			weight: "200",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-Light.woff2",
			weight: "300",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-Regular.woff2",
			weight: "400",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-Medium.woff2",
			weight: "500",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-SemiBold.woff2",
			weight: "600",
			style: "normal",
		},
		{
			path: "./basically-a-mono/BasicallyAMono-Bold.woff2",
			weight: "700",
			style: "normal",
		},
	],
});
