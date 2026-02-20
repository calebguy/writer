export function EntryCardSkeleton() {
	return (
		<div className="aspect-square bg-neutral-900 flex flex-col px-2 pt-2 pb-0.5 overflow-hidden">
			<div className="grow min-h-0 space-y-2 pt-1">
				<div className="h-4 bg-neutral-700 skeleton-bar animate-pulse rounded w-3/4" />
				<div className="h-4 bg-neutral-700 skeleton-bar animate-pulse rounded w-full" />
				<div className="h-4 bg-neutral-700 skeleton-bar animate-pulse rounded w-5/6" />
				<div className="h-4 bg-neutral-700 skeleton-bar animate-pulse rounded w-2/3" />
			</div>
			<div className="flex items-end justify-between text-sm leading-3 pt-2 shrink-0 pb-2">
				<div className="h-3.5 w-3.5 bg-neutral-700 skeleton-bar animate-pulse rounded" />
				<div className="h-3 bg-neutral-700 skeleton-bar animate-pulse rounded w-20" />
			</div>
		</div>
	);
}
