import { type MouseEventHandler, useCallback } from "react";
import { cn } from "../utils/cn";

import { Link } from "react-router-dom";

interface BlockProps {
	title: string;
	id: string;
	href?: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	isLoading?: boolean;
}

export default function Block({
	title,
	id,
	href,
	onClick,
	isLoading,
}: BlockProps) {
	const className = cn(
		"border-0 border-neutral-700 px-3 py-2 bg-neutral-900 aspect-square flex flex-col justify-between overflow-auto",
		{
			"hover:cursor-not-allowed": isLoading,
			"hover:cursor-zoom-in": !isLoading,
		},
	);

	const renderChildren = useCallback(() => {
		return (
			<>
				<div className="text-left text-neutral-200 whitespace-pre text-wrap overflow-auto">
					{title}
				</div>
				<div className="text-right text-neutral-600 mt-1">{id}</div>
			</>
		);
	}, [title, id]);
	return href && !isLoading ? (
		<Link onClick={onClick} to={href} key={id} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
