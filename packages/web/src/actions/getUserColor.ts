"use server";

import type { Hex } from "viem";

export async function getUserColor(address: Hex): Promise<string | null> {
	try {
		const baseUrl =
			process.env.NEXT_PUBLIC_BASE_URL || process.env.API_BASE_URL;
		if (!baseUrl) {
			console.warn(
				"NEXT_PUBLIC_BASE_URL not configured for server-side color fetch",
			);
			return null;
		}

		const response = await fetch(`${baseUrl}/me/${address}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data?.user?.color || null;
	} catch (error) {
		console.warn("Failed to fetch user color server-side:", error);
		return null;
	}
}
