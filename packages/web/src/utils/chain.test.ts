import { describe, expect, test } from "bun:test";
import { anvil, optimism } from "viem/chains";
import { chainForTargetChainId } from "./chain";

describe("chainForTargetChainId", () => {
	test("returns Optimism for production chain ID", () => {
		expect(chainForTargetChainId(optimism.id)).toBe(optimism);
	});

	test("returns Anvil for local chain ID", () => {
		expect(chainForTargetChainId(anvil.id)).toBe(anvil);
	});

	test("rejects unsupported chain IDs", () => {
		expect(() => chainForTargetChainId(1)).toThrow(
			"Unsupported target chain ID: 1",
		);
	});
});
