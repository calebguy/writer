const LOGO_COUNT = 32;

export function pickTwoLogos(): [number, number] {
	const first = Math.floor(Math.random() * LOGO_COUNT) + 1;
	let second = Math.floor(Math.random() * (LOGO_COUNT - 1)) + 1;
	if (second >= first) second++;
	return [first, second];
}
