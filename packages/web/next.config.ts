import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return {
			beforeFiles: [
				{
					source: "/writer/:address/:id(\\d+).md",
					destination: "/api/writer-markdown/:address/:id",
				},
			],
		};
	},
};

export default nextConfig;
