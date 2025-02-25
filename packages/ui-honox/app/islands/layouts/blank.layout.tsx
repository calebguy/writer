// import { useSetAuthColor } from "../hooks/useSetAuthColor.ts";

interface BlankLayoutProps {
	children: React.ReactNode;
}

export function BlankLayout({ children }: BlankLayoutProps) {
	// useSetAuthColor();
	return <div className="grow flex flex-col px-8 pt-8 pb-2">{children}</div>;
}
