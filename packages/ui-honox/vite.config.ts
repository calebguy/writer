// vite.config.ts
import build from "@hono/vite-build/cloudflare-pages";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	if (mode === "client") {
		return {
			build: {
				rollupOptions: {
					input: ["./app/client.ts"],
					output: {
						entryFileNames: "static/client.js",
						chunkFileNames: "static/assets/[name]-[hash].js",
						assetFileNames: "static/assets/[name].[ext]",
					},
				},
				emptyOutDir: false,
			},
		};
	}
	return {
		ssr: {
			external: ["react", "react-dom", "@privy-io/react-auth"],
		},
		plugins: [honox(), build(), tailwindcss()],
	};
});
