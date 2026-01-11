export function WriterCardSkeleton() {
	return (
		<div className="aspect-square bg-neutral-900 flex flex-col justify-between px-2 pt-2 pb-1.5 animate-pulse">
			<div className="space-y-2 pt-1">
				<div className="h-4 bg-neutral-700 rounded w-3/4" />
				<div className="h-4 bg-neutral-700 rounded w-1/2" />
			</div>
			<div className="text-right">
				<div className="h-3 bg-neutral-700 rounded w-6 ml-auto" />
			</div>
		</div>
	);
}
