"use server";

import type { Hex } from "viem";
import { env } from "./env";

export async function getUserColor(address: Hex): Promise<string | null> {
	try {
		const response = await fetch(`${env.NEXT_PUBLIC_BASE_URL}/me/${address}`, {
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
