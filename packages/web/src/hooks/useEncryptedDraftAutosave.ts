"use client";

import {
	clearEncryptedDraft,
	loadEncryptedDraft,
	saveEncryptedDraft,
	type EntryDraftPayload,
} from "@/utils/encryptedDrafts";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_AUTOSAVE_DELAY_MS = 750;

type ShouldRestoreDraft = (
	currentMarkdown: string,
	draft: EntryDraftPayload,
) => boolean;

type UseEncryptedDraftAutosaveOptions = {
	draftId: string | undefined;
	markdown: string;
	encrypted: boolean;
	onRestore: (payload: EntryDraftPayload) => void;
	enabled?: boolean;
	shouldRestore?: ShouldRestoreDraft;
};

export function useEncryptedDraftAutosave({
	draftId,
	markdown,
	encrypted,
	onRestore,
	enabled = true,
	shouldRestore = shouldRestoreIntoEmptyEditor,
}: UseEncryptedDraftAutosaveOptions) {
	const latestMarkdownRef = useRef(markdown);
	const [restoredAt, setRestoredAt] = useState<number | null>(null);

	useEffect(() => {
		latestMarkdownRef.current = markdown;
	}, [markdown]);

	useEffect(() => {
		if (!draftId) return;
		let cancelled = false;
		loadEncryptedDraft(draftId)
			.then((draft) => {
				if (cancelled || !draft) return;
				if (!shouldRestore(latestMarkdownRef.current, draft.payload)) return;
				onRestore(draft.payload);
				setRestoredAt(draft.updatedAt);
			})
			.catch((error) => {
				console.error("Could not restore encrypted draft", error);
			});

		return () => {
			cancelled = true;
		};
	}, [draftId, onRestore, shouldRestore]);

	useEffect(() => {
		if (!enabled || !draftId || !markdown.trim()) return;
		const timeout = window.setTimeout(() => {
			saveEncryptedDraft(draftId, { markdown, encrypted }).catch((error) => {
				console.error("Could not save encrypted draft", error);
			});
		}, DRAFT_AUTOSAVE_DELAY_MS);

		return () => window.clearTimeout(timeout);
	}, [draftId, enabled, encrypted, markdown]);

	const clearDraft = useCallback(async () => {
		if (!draftId) return;
		await clearEncryptedDraft(draftId);
		setRestoredAt(null);
	}, [draftId]);

	return { clearDraft, restoredAt };
}

function shouldRestoreIntoEmptyEditor(
	currentMarkdown: string,
	draft: EntryDraftPayload,
) {
	return !currentMarkdown.trim() && draft.markdown.trim().length > 0;
}
