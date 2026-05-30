type PrimaryShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">;

export function isPrimaryEnterShortcut(event: PrimaryShortcutEvent) {
	return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}

export function isPrimaryEditShortcut(event: PrimaryShortcutEvent) {
	return (
		(event.metaKey || event.ctrlKey) && (event.key === "e" || event.key === "E")
	);
}

export function isEscapeKey(event: Pick<KeyboardEvent, "key">) {
	return event.key === "Escape" || event.key === "Esc";
}
