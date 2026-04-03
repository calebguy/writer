export function Footer() {
	return (
		<footer className="flex justify-between items-end w-full font-serif text-base text-neutral-600 dark:text-white/40 pt-4">
			<span className="flex-1 text-left hidden md:block">writer.place</span>
			<span className="flex-1 text-left md:text-center">
				write today, forever
			</span>
			<span className="flex-1 text-right flex justify-end gap-3">
				<a
					href="/about"
					className="text-neutral-600 dark:text-white/40 no-underline hover:text-primary"
				>
					about
				</a>
				<a
					href="/docs"
					className="text-neutral-600 dark:text-white/40 no-underline hover:text-primary"
				>
					docs
				</a>
			</span>
		</footer>
	);
}
