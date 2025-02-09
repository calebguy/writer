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
	leftIcon?: React.ReactNode;
}

export default function Block({
	title,
	id,
	href,
	onClick,
	isLoading,
	leftIcon,
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
			<div className="p-2 flex flex-col grow h-1">
				<MD className="grow">{title}</MD>
				<div
					className={cn("flex items-end", {
						"justify-between": leftIcon,
						"justify-end": !leftIcon,
					})}
				>
					{leftIcon && <div>{leftIcon}</div>}
					<div className="text-neutral-600 text-sm leading-3 pt-2">
						{isLoading ? <span>...</span> : id}
					</div>
				</div>
			</div>
		);
	}, [title, id, isLoading, leftIcon]);
	return href && !isLoading ? (
		<Link onClick={onClick} to={href} key={id} className={className}>
			{renderChildren()}
		</Link>
	) : (
		<div className={className}>{renderChildren()}</div>
	);
}
