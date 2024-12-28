import { SyndicateClient } from "@syndicateio/syndicate-node";
import { fromHex } from "viem";
import { env } from "../env";

export const syndicate = new SyndicateClient({ token: env.SYNDICATE_API_KEY });

function synDataToUuid(input: string) {
	// Remove 'syn' from the input
	const cleanedInput = input.replace("syn", "");

	// Insert hyphens to format as a UUID
	const uuid = `${cleanedInput.slice(0, 8)}-${cleanedInput.slice(
		8,
		12,
	)}-${cleanedInput.slice(12, 16)}-${cleanedInput.slice(
		16,
		20,
	)}-${cleanedInput.slice(20)}`;

	return uuid;
}

export function getSynIdFromRawInput(input: string) {
	try {
		const synIdEncoded = input.slice(-70);
		const synIdDecoded = fromHex(`0x${synIdEncoded}`, "string");
		const isSyndicateTx = synIdDecoded.startsWith("syn");
		if (isSyndicateTx) {
			return synDataToUuid(synIdDecoded);
		}
		return null;
	} catch {
		return null;
	}
}
