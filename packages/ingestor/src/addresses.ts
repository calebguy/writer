import type { Db } from "db";
import type { Hex } from "viem";

export class AddressRegistry {
	private factoryAddresses: Set<string>;
	private colorRegistryAddress: string;
	private storageAddresses: Set<string>;
	private newlyDiscovered: string[] = [];

	constructor(config: { factories: string[]; colorRegistry: string }) {
		this.factoryAddresses = new Set(
			config.factories.map((a) => a.toLowerCase()),
		);
		this.colorRegistryAddress = config.colorRegistry.toLowerCase();
		this.storageAddresses = new Set();
	}

	async seedFromDb(db: Db): Promise<void> {
		const addresses = await db.getAllStorageAddresses();
		for (const addr of addresses) {
			this.storageAddresses.add(addr.toLowerCase());
		}
	}

	addStorageAddress(addr: string): void {
		const normalized = addr.toLowerCase();
		if (!this.storageAddresses.has(normalized)) {
			this.storageAddresses.add(normalized);
			this.newlyDiscovered.push(normalized);
		}
	}

	drainNewlyDiscovered(): Hex[] {
		const result = this.newlyDiscovered.map((a) => a as Hex);
		this.newlyDiscovered = [];
		return result;
	}

	getAllAddresses(): Hex[] {
		return [
			...this.factoryAddresses,
			this.colorRegistryAddress,
			...this.storageAddresses,
		] as Hex[];
	}

	isFactory(addr: string): boolean {
		return this.factoryAddresses.has(addr.toLowerCase());
	}

	isColorRegistry(addr: string): boolean {
		return this.colorRegistryAddress === addr.toLowerCase();
	}

	isStorage(addr: string): boolean {
		return this.storageAddresses.has(addr.toLowerCase());
	}

	get storageCount(): number {
		return this.storageAddresses.size;
	}
}
