import type { Hex } from "viem";

export function shortenAddress(address: Hex) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function hslToHex(h: number, s: number, l: number): `#${string}` {
	const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l / 100 - c / 2;
	let r: string | number = 0;
	let g: string | number = 0;
	let b: string | number = 0;

	if (0 <= h && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (60 <= h && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (120 <= h && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (180 <= h && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (240 <= h && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (300 <= h && h < 360) {
		r = c;
		g = 0;
		b = x;
	}
	// Having obtained RGB, convert channels to hex
	r = Math.round((r + m) * 255).toString(16);
	g = Math.round((g + m) * 255).toString(16);
	b = Math.round((b + m) * 255).toString(16);

	// Prepend 0s, if necessary
	if (r.length === 1) r = `0${r}`;
	if (g.length === 1) g = `0${g}`;
	if (b.length === 1) b = `0${b}`;

	return `#${r}${g}${b}`;
}

export function getRootVariableAsHex(h: string, s: string, l: string) {
	const rootStyles = getComputedStyle(document.documentElement);
	const hue = rootStyles.getPropertyValue(h).trim();
	const saturation = rootStyles.getPropertyValue(s).trim().replace("%", "");
	const lightness = rootStyles.getPropertyValue(l).trim().replace("%", "");
	return hslToHex(Number(hue), Number(saturation), Number(lightness));
}
