import type { Db } from "db";
import type { Hex } from "viem";

export class AddressRegistry {
	private factoryAddresses: Set<string>;
	private colorRegistryAddress: string;
	private storageAddresses: Set<string>;
	private writerAddresses: Set<string>;
	private newlyDiscovered: string[] = [];

	constructor(config: { factories: string[]; colorRegistry: string }) {
		this.factoryAddresses = new Set(
			config.factories.map((a) => a.toLowerCase()),
		);
		this.colorRegistryAddress = config.colorRegistry.toLowerCase();
		this.storageAddresses = new Set();
		this.writerAddresses = new Set();
	}

	async seedFromDb(db: Db): Promise<void> {
		const [storageAddresses, writerAddresses] = await Promise.all([
			db.getAllStorageAddresses(),
			db.getAllWriterAddresses(),
		]);
		for (const addr of storageAddresses) {
			this.storageAddresses.add(addr.toLowerCase());
		}
		for (const addr of writerAddresses) {
			this.writerAddresses.add(addr.toLowerCase());
		}
	}

	addStorageAddress(addr: string): void {
		const normalized = addr.toLowerCase();
		if (!this.storageAddresses.has(normalized)) {
			this.storageAddresses.add(normalized);
			this.newlyDiscovered.push(normalized);
		}
	}

	addWriterAddress(addr: string): void {
		const normalized = addr.toLowerCase();
		if (!this.writerAddresses.has(normalized)) {
			this.writerAddresses.add(normalized);
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
			...this.writerAddresses,
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

	isWriter(addr: string): boolean {
		return this.writerAddresses.has(addr.toLowerCase());
	}

	get storageCount(): number {
		return this.storageAddresses.size;
	}
}
