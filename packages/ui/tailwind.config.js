/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				lime: "#d2ff2e",
				limeSecondary: "#485900",
			},
		},
	},
	plugins: [],
};
