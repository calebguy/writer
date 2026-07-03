"use client";

import { usePathname } from "next/navigation";

const links = [
	{ href: "/about", label: "about" },
	{ href: "/docs", label: "docs" },
	{ href: "/fund", label: "fund" },
	{ href: "https://store.writer.place", label: "buy" },
];

export function Footer() {
	const pathname = usePathname();
	const isWriterEntryPage = /^\/writer\/[^/]+\/\d+$/.test(pathname);

	if (isWriterEntryPage) {
		return null;
	}

	return (
		<footer className="flex justify-between items-end w-full font-serif text-base dark:text-neutral-500 text-neutral-400 pt-4">
			<span className="flex-1 text-left hidden md:block">writer.place</span>
			<span className="flex-1 hidden md:block text-left md:text-center">
				write today, forever
			</span>
			<span className="flex-1 text-right flex justify-end gap-3">
				{links.map((link) => (
					<a
						key={link.href}
						href={link.href}
						className="no-underline hover:text-primary"
					>
						{link.label}
					</a>
				))}
			</span>
		</footer>
	);
}
