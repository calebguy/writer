export const writerFactoryAbi = [
	{
		type: "function",
		name: "create",
		inputs: [
			{ name: "title", type: "string", internalType: "string" },
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
		type: "function",
		name: "writerIdCounter",
		inputs: [],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "event",
		name: "WriterCreated",
		inputs: [
			{ name: "id", type: "uint256", indexed: true, internalType: "uint256" },
			{
				name: "writerAddress",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "admin",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "title",
				type: "string",
				indexed: false,
				internalType: "string",
			},
			{
				name: "storeAddress",
				type: "address",
				indexed: false,
				internalType: "address",
			},
			{
				name: "managers",
				type: "address[]",
				indexed: false,
				internalType: "address[]",
			},
		],
		anonymous: false,
	},
] as const;
