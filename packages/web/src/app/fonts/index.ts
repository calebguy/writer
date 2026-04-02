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

export const diatypeRoundedMono = localFont({
	variable: "--font-diatype-rounded-mono",
	src: [
		{
			path: "./diatype-rounded-mono/ABCDiatypeRoundedMonoVariable.woff2",
			style: "normal",
		},
	],
});
