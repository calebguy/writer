import type { SvgProps } from ".";

export function Arrow({ title, ...props }: SvgProps) {
	return (
		<svg
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 24 24"
			height="200px"
			width="200px"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>{title || "arrow"}</title>
			<path fill="none" d="M0 0h24v24H0z" />
			<path d="M6 6v2h8.59L5 17.59 6.41 19 16 9.41V18h2V6z" />
		</svg>
	);
}
