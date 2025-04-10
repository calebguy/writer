import type { SvgProps } from ".";

export function Lock(props: SvgProps) {
	return (
		<svg
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 16 16"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Lock</title>
			<path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2" />
		</svg>
	);
}
