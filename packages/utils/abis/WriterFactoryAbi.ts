export const WriterFactoryAbi = [
	{
		type: "function",
		name: "computeWriterAddress",
		inputs: [
			{
				name: "title",
				type: "string",
				internalType: "string",
			},
			{
				name: "admin",
				type: "address",
				internalType: "address",
			},
			{
				name: "managers",
				type: "address[]",
				internalType: "address[]",
			},
			{
				name: "salt",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "computeWriterStorageAddress",
		inputs: [
			{
				name: "salt",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "create",
		inputs: [
			{
				name: "title",
				type: "string",
				internalType: "string",
			},
			{
				name: "admin",
				type: "address",
				internalType: "address",
			},
			{
				name: "managers",
				type: "address[]",
				internalType: "address[]",
			},
			{
				name: "salt",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [
			{
				name: "writerAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "storeAddress",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "nonpayable",
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
				name: "managers",
				type: "address[]",
				indexed: false,
				internalType: "address[]",
			},
		],
		anonymous: false,
	},
] as const;
