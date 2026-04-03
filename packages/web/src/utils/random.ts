const LOGO_COUNT = 32;

export function pickLogo(): number {
	return Math.floor(Math.random() * LOGO_COUNT) + 1;
}
