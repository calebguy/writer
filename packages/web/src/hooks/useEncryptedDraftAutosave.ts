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
	const latestEncryptedRef = useRef(encrypted);
	const [restoredAt, setRestoredAt] = useState<number | null>(null);
	const [isDraftLoadComplete, setIsDraftLoadComplete] = useState(false);
	const hasStoredDraftRef = useRef(false);
	const saveTimeoutRef = useRef<number | null>(null);

	const clearPendingSave = useCallback(() => {
		if (saveTimeoutRef.current === null) return;
		window.clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = null;
	}, []);

	useEffect(() => {
		latestMarkdownRef.current = markdown;
		latestEncryptedRef.current = encrypted;
	}, [encrypted, markdown]);

	useEffect(() => {
		hasStoredDraftRef.current = false;
		setRestoredAt(null);
		setIsDraftLoadComplete(false);
		if (!draftId) {
			setIsDraftLoadComplete(true);
			return;
		}

		let cancelled = false;
		loadEncryptedDraft(draftId)
			.then((draft) => {
				if (cancelled) return;
				hasStoredDraftRef.current = Boolean(draft);
				if (!draft) return;
				if (!shouldRestore(latestMarkdownRef.current, draft.payload)) return;
				onRestore(draft.payload);
				setRestoredAt(draft.updatedAt);
			})
			.catch((error) => {
				console.error("Could not restore encrypted draft", error);
			})
			.finally(() => {
				if (!cancelled) setIsDraftLoadComplete(true);
			});

		return () => {
			cancelled = true;
		};
	}, [draftId, onRestore, shouldRestore]);

	useEffect(() => {
		if (!enabled || !draftId || !isDraftLoadComplete) return;
		const hasContent = markdown.trim().length > 0;
		if (!hasContent && !hasStoredDraftRef.current) return;

		const timeout = window.setTimeout(() => {
			saveTimeoutRef.current = null;

			if (!hasContent) {
				clearEncryptedDraft(draftId)
					.then(() => {
						hasStoredDraftRef.current = false;
						setRestoredAt(null);
					})
					.catch((error) => {
						console.error("Could not clear encrypted draft", error);
					});
				return;
			}

			saveEncryptedDraft(draftId, { markdown, encrypted })
				.then(() => {
					hasStoredDraftRef.current = true;
					setRestoredAt(Date.now());
				})
				.catch((error) => {
					console.error("Could not save encrypted draft", error);
				});
		}, DRAFT_AUTOSAVE_DELAY_MS);
		saveTimeoutRef.current = timeout;

		return () => {
			if (saveTimeoutRef.current === timeout) {
				saveTimeoutRef.current = null;
			}
			window.clearTimeout(timeout);
		};
	}, [draftId, enabled, encrypted, isDraftLoadComplete, markdown]);

	const saveDraft = useCallback(async () => {
		const latestMarkdown = latestMarkdownRef.current;
		if (!enabled || !draftId || !latestMarkdown.trim()) return;
		clearPendingSave();
		await saveEncryptedDraft(draftId, {
			markdown: latestMarkdown,
			encrypted: latestEncryptedRef.current,
		});
		hasStoredDraftRef.current = true;
		setRestoredAt(Date.now());
	}, [clearPendingSave, draftId, enabled]);

	const clearDraft = useCallback(async () => {
		if (!draftId) return;
		clearPendingSave();
		await clearEncryptedDraft(draftId);
		hasStoredDraftRef.current = false;
		setRestoredAt(null);
	}, [clearPendingSave, draftId]);

	return { clearDraft, restoredAt, saveDraft };
}

function shouldRestoreIntoEmptyEditor(
	currentMarkdown: string,
	draft: EntryDraftPayload,
) {
	return !currentMarkdown.trim() && draft.markdown.trim().length > 0;
}
