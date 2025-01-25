class Color {
	defaultColor = [255, 255, 255];
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

	get secondaryColor() {
		return this.primaryColor.map((c) => c - 100);
	}
}

const color = new Color();
export default color;
