import { useCallback } from "react";
import { cn } from "../utils/cn";

// import { Link } from "react-router-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
const MDX = dynamic(() => import("./markdown/MDX"), { ssr: false });

interface BlockProps {
	title?: string | null;
	href?: string;
	isLoading?: boolean;
	bottom?: React.ReactNode;
}

export default function Block({ title, href, isLoading, bottom }: BlockProps) {
	const className = cn(
		"border-0 border-neutral-700 bg-neutral-900 aspect-square flex flex-col justify-between overflow-auto relative",
		{
			"hover:cursor-wait": isLoading,
			"hover:cursor-zoom-in": !isLoading,
		},
	);

	const renderChildren = useCallback(() => {
		return (
			<div className="p-2 flex flex-col grow h-1 relative">
				<MDX className="grow" markdown={title ?? ""} />
				{isLoading && <div className="text-center text-neutral-600">...</div>}
				{!isLoading && bottom}
			</div>
		);
	}, [title, isLoading, bottom]);
	return href && !isLoading ? (
		<Link href={href} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
