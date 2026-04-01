export function Footer() {
	return (
		<footer className="flex justify-between items-end w-full font-serif text-base light:text-black/40 dark:text-white/40">
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
