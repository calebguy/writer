export function minBigInt(a: bigint, ...args: (bigint | undefined)[]): bigint {
	let m = a;
	for (const z of args) {
		if (typeof z !== "undefined" && z < m) {
			m = z;
		}
	}
	return m;
}
