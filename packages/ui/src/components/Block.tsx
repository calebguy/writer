import { type MouseEventHandler, useCallback } from "react";
import { cn } from "../utils/cn";

import { Link } from "react-router-dom";
import { MD } from "./markdown/MD";

interface BlockProps {
	title?: string | null;
	href?: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	isLoading?: boolean;
	bottom?: React.ReactNode;
}

export default function Block({
	title,
	href,
	onClick,
	isLoading,
	bottom,
}: BlockProps) {
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
				<MD className="grow">{title}</MD>
				{isLoading && <div className="text-center text-neutral-600">...</div>}
				{!isLoading && bottom}
			</div>
		);
	}, [title, isLoading, bottom]);
	return href && !isLoading ? (
		<Link onClick={onClick} to={href} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
