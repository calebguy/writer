export interface Writer {
	id: number;
	title: string | null;
	address: string;
	storageAddress: string;
	admin: string;
	createdAtBlock: number | null;
	createdAtHash: string;
	authors: string[];
}

export type BlockCreateInput = {
	value: string;
};
