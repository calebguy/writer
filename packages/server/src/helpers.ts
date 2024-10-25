export function minBigInt(a: bigint, ...args: (bigint | undefined)[]): bigint {
	let m = a;
	for (const z of args) {
		if (typeof z !== "undefined" && z < m) {
			m = z;
		}
	}
	return m;
}

export function synDataToUuid(input: string) {
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

export function getChunksFromContent(content: string) {
	const chunks = content.split("\n");
	return chunks;
}
