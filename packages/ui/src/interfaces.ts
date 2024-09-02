export interface Writer {
	id: number;
	title: string | null;
	address: string;
	storageAddress: string;
	admin: string;
	createdAtBlock: string;
	createdAtHash: string;
	authors: string[];
}

export type CreateNewBucketInputs = {
	title: string;
};
