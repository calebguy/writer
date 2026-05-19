import { describe, expect, test } from "bun:test";
import {
	applyWriterAddressOrder,
	swappedPersistedWriterOrder,
} from "./writerOrder";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const PENDING = "pending-1";

function writer(address: string, createdAtHash: string | null = "0xhash") {
	return { address, createdAtHash };
}

describe("swappedPersistedWriterOrder", () => {
	test("swaps two confirmed writers and returns the persisted order", () => {
		expect(
			swappedPersistedWriterOrder([writer(A), writer(B), writer(C)], A, C),
		).toEqual([C, B, A]);
	});

	test("does not persist pending writers", () => {
		expect(
			swappedPersistedWriterOrder(
				[writer(A), writer(PENDING, null), writer(B)],
				PENDING,
				B,
			),
		).toBeNull();
	});

	test("returns null when source and target match", () => {
		expect(
			swappedPersistedWriterOrder([writer(A), writer(B)], A, A),
		).toBeNull();
	});
});

describe("applyWriterAddressOrder", () => {
	test("applies persisted order while preserving unmentioned writers first", () => {
		expect(
			applyWriterAddressOrder([writer(A), writer(B), writer(C)], [C, A]).map(
				(w) => w.address,
			),
		).toEqual([B, C, A]);
	});

	test("returns a shallow copy when no order exists", () => {
		const writers = [writer(A), writer(B)];
		const ordered = applyWriterAddressOrder(writers, []);

		expect(ordered).toEqual(writers);
		expect(ordered).not.toBe(writers);
	});
});
