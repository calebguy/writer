import type { SvgProps } from ".";

export function Cursor(props: SvgProps) {
	return (
		<svg
			{...props}
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Cursor</title>
			<path fill="none" d="M0 0h24v24H0z" />
			<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 5.63l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83a.996.996 0 0 0 0-1.41z" />
		</svg>
	);
}
