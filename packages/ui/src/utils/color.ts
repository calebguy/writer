import { RGBToHex, bytes32ToHexColor, hexToRGB } from "./utils";

class Color {
	defaultColor = [252, 186, 3];
	primaryColor = this.defaultColor;

	setColorFromRGB(primaryRGB: Array<number>) {
		this.primaryColor = primaryRGB;
		document.documentElement.style.setProperty(
			"--color-primary",
			`${this.primaryColor[0]} ${this.primaryColor[1]} ${this.primaryColor[2]}`,
		);
		document.documentElement.style.setProperty(
			"--color-secondary",
			`${this.secondaryColor[0]} ${this.secondaryColor[1]} ${this.secondaryColor[2]}`,
		);
	}

	setColorFromLongHex(hexColor: string) {
		const rgb = hexToRGB(bytes32ToHexColor(hexColor));
		this.setColorFromRGB([rgb.r, rgb.g, rgb.b]);
	}

	get secondaryColor() {
		return this.primaryColor.map((c) => c - 100);
	}

	get primaryHex() {
		return RGBToHex(
			this.primaryColor[0],
			this.primaryColor[1],
			this.primaryColor[2],
		);
	}

	get secondaryHex() {
		return RGBToHex(
			this.secondaryColor[0],
			this.secondaryColor[1],
			this.secondaryColor[2],
		);
	}
}

const color = new Color();
export default color;
