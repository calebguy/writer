type CardSkeletonVariant = "writer" | "entry";

export function CardSkeleton({ variant }: { variant: CardSkeletonVariant }) {
	return (
		<div className="aspect-square bg-surface flex flex-col justify-between px-2 pt-2 pb-1.5 overflow-hidden rounded-xs">
			<div className="grow min-h-0 space-y-2 pt-1">
				<div className="h-4 bg-white dark:bg-surface-raised animate-pulse rounded w-3/4" />
				<div
					className={`h-4 bg-white dark:bg-surface-raised animate-pulse rounded ${
						variant === "writer" ? "w-1/2" : "w-full"
					}`}
				/>
				{variant === "entry" && (
					<>
						<div className="h-4 bg-white dark:bg-surface-raised animate-pulse rounded w-5/6" />
						<div className="h-4 bg-white dark:bg-surface-raised animate-pulse rounded w-2/3" />
					</>
				)}
			</div>
			{variant === "writer" ? (
				<div className="text-right">
					<div className="h-3 bg-white dark:bg-surface-raised animate-pulse rounded w-6 ml-auto" />
				</div>
			) : (
				<div className="flex items-end justify-between text-sm leading-3 pt-2 shrink-0 pb-0.5">
					<div className="h-3.5 w-3.5 bg-white dark:bg-surface-raised animate-pulse rounded" />
					<div className="h-3 bg-white dark:bg-surface-raised animate-pulse rounded w-20" />
				</div>
			)}
		</div>
	);
}
