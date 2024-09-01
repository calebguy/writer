export const WRITER_FACTORY_ABI = [
	{
		type: "function",
		name: "create",
		inputs: [
			{ name: "admin", type: "address", internalType: "address" },
			{ name: "managers", type: "address[]", internalType: "address[]" },
		],
		outputs: [{ name: "", type: "address", internalType: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "get",
		inputs: [{ name: "author", type: "address", internalType: "address" }],
		outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
		stateMutability: "view",
	},
	{
		type: "event",
		name: "WriterCreated",
		inputs: [
			{
				name: "writerAddress",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "storeAddress",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "author",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "writers",
				type: "address[]",
				indexed: false,
				internalType: "address[]",
			},
		],
		anonymous: false,
	},
];
