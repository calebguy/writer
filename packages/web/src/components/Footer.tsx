export function Footer() {
	return (
		<footer className="hidden md:flex justify-between items-end w-full px-4 pb-3 pt-2 font-serif text-[0.9rem] md:text-[1.15rem] light:text-black/40 dark:text-white/40 mt-auto">
			<span className="flex-1 text-left">writer.place</span>
			<span className="flex-1 text-center">write today, forever</span>
			<span className="flex-1 text-right flex justify-end gap-3">
				<a
					href="/about"
					className="light:text-black/40 dark:text-white/40 no-underline hover:text-primary"
				>
					about
				</a>
				<a
					href="/docs"
					className="light:text-black/40 dark:text-white/40 no-underline hover:text-primary"
				>
					docs
				</a>
			</span>
		</footer>
	);
}
