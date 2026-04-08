import type { SvgProps } from ".";

export function Check({ title, ...props }: SvgProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<title>{title || "check"}</title>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}
