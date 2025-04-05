import { useSetAuthColor } from "../hooks/useSetAuthColor.ts";

interface BaseLayoutProps {
	children: React.ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
	useSetAuthColor();
	return (
		<div className="grow flex flex-col px-4 md:px-8 pt-4 md:pt-8 pb-2">
			{children}
		</div>
	);
}
