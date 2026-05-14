import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return {
			beforeFiles: [
				{
					source: "/docs.md",
					destination: "/api/docs-markdown",
				},
				{
					source: "/explore.md",
					destination: "/api/explore-markdown",
				},
				{
					source: "/writer/:address/:id(\\d+).md",
					destination: "/api/writer-markdown/:address/:id",
				},
				{
					source: "/writer/:address.md",
					destination: "/api/writer-place-markdown/:address",
				},
			],
		};
	},
};

export default nextConfig;
