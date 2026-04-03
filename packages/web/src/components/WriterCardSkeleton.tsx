export function WriterCardSkeleton() {
	return (
		<div className="aspect-square bg-surface flex flex-col justify-between px-2 pt-2 pb-1.5">
			<div className="space-y-2 pt-1">
				<div className="h-4 bg-surface-raised animate-pulse rounded w-3/4" />
				<div className="h-4 bg-surface-raised animate-pulse rounded w-1/2" />
			</div>
			<div className="text-right">
				<div className="h-3 bg-surface-raised animate-pulse rounded w-6 ml-auto" />
			</div>
		</div>
	);
}
