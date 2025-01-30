/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	fontFamily: {
		serif: ["LTRemark", "serif"],
		mono: ["BasicallyAMono", "monospace"],
	},
	theme: {
		extend: {
			colors: {
				primary: "rgb(var(--color-primary))",
				secondary: "rgb(var(--color-secondary))",
			},
		},
	},
	plugins: [],
};
