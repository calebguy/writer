import {
	markdownGuideIntro,
	markdownShortcutItems,
	markdownSyntaxGroups,
} from "@/content/markdownGuide";
import { cn } from "@/utils/cn";

function ExampleBlock({ value }: { value: string }) {
	return (
		<pre className="mt-2 whitespace-pre-wrap rounded-xs bg-background p-2 font-mono text-sm text-primary">
			{value}
		</pre>
	);
}

export function MarkdownGuide() {
	return (
		<div className="space-y-8">
			<p className="dark:text-neutral-200 text-neutral-800">
				{markdownGuideIntro}
			</p>

			<section id="syntax" className="scroll-mt-16 space-y-6">
				<h3 className="font-serif text-2xl italic text-primary">Syntax</h3>
				{markdownSyntaxGroups.map((group) => (
					<div key={group.title}>
						<h4 className="mb-3 font-serif text-xl text-primary">
							{group.title}
						</h4>
						<div className="grid gap-3 md:grid-cols-2">
							{group.items.map((item) => (
								<div
									key={item.name}
									className="rounded-xs border border-neutral-300 bg-surface-raised p-2.5 dark:border-neutral-700"
								>
									<div className="flex items-baseline justify-between gap-3">
										<p className="font-serif text-lg text-primary">
											{item.name}
										</p>
										<span className="text-right text-xs text-neutral-500 dark:text-neutral-400">
											{item.result}
										</span>
									</div>
									<ExampleBlock value={item.input} />
									<p className="mt-2 text-sm dark:text-neutral-200 text-neutral-800">
										{item.details}
									</p>
								</div>
							))}
						</div>
					</div>
				))}
			</section>

			<section id="shortcuts" className="scroll-mt-16">
				<h3 className="mb-3 font-serif text-2xl italic text-primary">
					Shortcuts
				</h3>
				<div className="overflow-x-auto rounded-xs border border-neutral-300 dark:border-neutral-700">
					<table className="w-full min-w-[600px] text-left text-sm">
						<thead className="bg-surface-raised text-primary">
							<tr>
								<th className="p-2 font-serif text-base">Action</th>
								<th className="p-2 font-serif text-base">Mac</th>
								<th className="p-2 font-serif text-base">Windows/Linux</th>
								<th className="p-2 font-serif text-base">Notes</th>
							</tr>
						</thead>
						<tbody>
							{markdownShortcutItems.map((shortcut) => (
								<tr
									key={shortcut.action}
									className="border-t border-neutral-300 dark:border-neutral-700"
								>
									<td className="p-2 dark:text-neutral-200 text-neutral-800">
										{shortcut.action}
									</td>
									<td className="p-2 font-mono text-primary">{shortcut.mac}</td>
									<td className="p-2 font-mono text-primary">
										{shortcut.windows}
									</td>
									<td className="p-2 dark:text-neutral-200 text-neutral-800">
										{shortcut.details}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}

export function MarkdownHelpLink({ className }: { className?: string }) {
	return (
		<a
			href="/docs#markdown"
			target="_blank"
			rel="noreferrer"
			className={cn(
				"font-mono text-xs text-muted transition-colors hover:text-primary",
				className,
			)}
		>
			Markdown help
		</a>
	);
}
