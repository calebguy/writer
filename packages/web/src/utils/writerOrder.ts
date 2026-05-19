type Addressed = { address: string };
type MaybePending = Addressed & { createdAtHash?: string | null };

function normalizeAddress(address: string) {
	return address.toLowerCase();
}

function sameAddress(a: string, b: string) {
	return normalizeAddress(a) === normalizeAddress(b);
}

function isPersistableWriter(writer: MaybePending) {
	return !!writer.createdAtHash && writer.address.startsWith("0x");
}

export function applyWriterAddressOrder<T extends Addressed>(
	writers: readonly T[],
	orderedAddresses: readonly string[],
): T[];
export function applyWriterAddressOrder(
	writers: undefined,
	orderedAddresses: readonly string[],
): undefined;
export function applyWriterAddressOrder<T extends Addressed>(
	writers: readonly T[] | undefined,
	orderedAddresses: readonly string[],
): T[] | undefined;
export function applyWriterAddressOrder<T extends Addressed>(
	writers: readonly T[] | undefined,
	orderedAddresses: readonly string[],
) {
	if (!writers) {
		return writers;
	}
	if (orderedAddresses.length === 0 || writers.length < 2) {
		return writers.slice();
	}

	const rankByAddress = new Map<string, number>();
	for (let i = 0; i < orderedAddresses.length; i++) {
		rankByAddress.set(normalizeAddress(orderedAddresses[i]), i);
	}

	return writers.slice().sort((a, b) => {
		const aRank = rankByAddress.get(normalizeAddress(a.address));
		const bRank = rankByAddress.get(normalizeAddress(b.address));

		if (aRank === undefined) {
			return bRank === undefined ? 0 : -1;
		}
		if (bRank === undefined) {
			return 1;
		}
		return aRank - bRank;
	});
}

export function swappedPersistedWriterOrder<T extends MaybePending>(
	writers: readonly T[] | undefined,
	fromAddress: string,
	toAddress: string,
) {
	if (!writers || writers.length < 2 || sameAddress(fromAddress, toAddress)) {
		return null;
	}

	const fromIndex = writers.findIndex(
		(writer) =>
			isPersistableWriter(writer) && sameAddress(writer.address, fromAddress),
	);
	const toIndex = writers.findIndex(
		(writer) =>
			isPersistableWriter(writer) && sameAddress(writer.address, toAddress),
	);
	if (fromIndex === -1 || toIndex === -1) {
		return null;
	}

	const next = writers.slice();
	[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
	return next
		.filter(isPersistableWriter)
		.map((writer) => normalizeAddress(writer.address));
}
