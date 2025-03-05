import { type MouseEventHandler, useCallback } from "react";
import { cn } from "../utils/cn";

import { Link } from "react-router-dom";
import { MD } from "./markdown/MD";

interface BlockProps {
	title?: string | null;
	id?: string;
	href?: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
	isLoading?: boolean;
	bottomRight?: React.ReactNode;
	topRight?: React.ReactNode;
}

export default function Block({
	title,
	id,
	href,
	onClick,
	isLoading,
	bottomRight,
	topRight,
}: BlockProps) {
	const className = cn(
		"border-0 border-neutral-700 bg-neutral-900 aspect-square flex flex-col justify-between overflow-auto",
		{
			"hover:cursor-wait": isLoading,
			"hover:cursor-zoom-in": !isLoading,
		},
	);

	const renderChildren = useCallback(() => {
		return (
			<div className="p-2 flex flex-col grow h-1 relative">
				<MD className="grow">{title}</MD>
				<div
					className={cn("flex items-end", {
						"justify-between": bottomRight,
						"justify-end": !bottomRight,
					})}
				>
					{bottomRight && (
						<div className="flex flex-col justify-end">{bottomRight}</div>
					)}
					<div className="text-neutral-600 text-sm leading-3 pt-2">
						{isLoading ? <span>...</span> : id}
					</div>
				</div>
				{topRight && <div className="absolute top-0 right-0">{topRight}</div>}
			</div>
		);
	}, [title, id, isLoading, bottomRight, topRight]);
	return href && !isLoading ? (
		<Link onClick={onClick} to={href} key={id} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
