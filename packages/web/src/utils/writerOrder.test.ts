import { describe, expect, test } from "bun:test";
import {
	applyWriterAddressOrder,
	insertedPersistedWriterOrder,
} from "./writerOrder";

const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "0xcccccccccccccccccccccccccccccccccccccccc";
const PENDING = "pending-1";

function writer(address: string, createdAtHash: string | null = "0xhash") {
	return { address, createdAtHash };
}

describe("insertedPersistedWriterOrder", () => {
	test("moves a writer before the target and shifts intervening writers", () => {
		expect(
			insertedPersistedWriterOrder(
				[writer(A), writer(B), writer(C)],
				A,
				C,
				"before",
			),
		).toEqual([B, A, C]);
	});

	test("moves a writer after the target and supports dropping at the end", () => {
		expect(
			insertedPersistedWriterOrder(
				[writer(A), writer(B), writer(C)],
				A,
				C,
				"after",
			),
		).toEqual([B, C, A]);
	});

	test("returns null when insertion would not change order", () => {
		expect(
			insertedPersistedWriterOrder(
				[writer(A), writer(B), writer(C)],
				B,
				A,
				"after",
			),
		).toBeNull();
	});

	test("does not persist pending writers", () => {
		expect(
			insertedPersistedWriterOrder(
				[writer(A), writer(PENDING, null), writer(B)],
				PENDING,
				B,
				"before",
			),
		).toBeNull();
	});

	test("returns null when source and target match", () => {
		expect(
			insertedPersistedWriterOrder([writer(A), writer(B)], A, A, "before"),
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
