import { describe, expect, test } from "bun:test";
import {
	buildEntryDraftId,
	decryptDraftPayload,
	encryptDraftPayload,
} from "./encryptedDrafts";

describe("buildEntryDraftId", () => {
	test("normalizes addresses and separates new entry drafts", () => {
		expect(
			buildEntryDraftId({
				kind: "create-entry",
				userAddress: "0xABCDEF",
				writerAddress: "0x123ABC",
			}),
		).toBe("create-entry:0xabcdef:0x123abc:new");
	});

	test("includes edit entry ids", () => {
		expect(
			buildEntryDraftId({
				kind: "edit-entry",
				userAddress: "0xABCDEF",
				writerAddress: "0x123ABC",
				entryId: 0,
			}),
		).toBe("edit-entry:0xabcdef:0x123abc:0");
	});
});

describe("draft payload encryption", () => {
	test("round trips without storing plaintext in the envelope", async () => {
		const key = await crypto.subtle.generateKey(
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"],
		);
		const payload = {
			markdown: "private thought that must not be plaintext",
			encrypted: true,
		};

		const encrypted = await encryptDraftPayload(payload, key);

		expect(encrypted.startsWith("local:v1:")).toBe(true);
		expect(encrypted).not.toContain(payload.markdown);
		await expect(decryptDraftPayload(encrypted, key)).resolves.toEqual(payload);
	});
});
