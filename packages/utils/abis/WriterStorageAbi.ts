export const WriterStorageAbi = [
	{
		type: "constructor",
		inputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "DEFAULT_ADMIN_ROLE",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "addChunk",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "index",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "content",
				type: "string",
				internalType: "string",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "create",
		inputs: [
			{
				name: "totalChunks",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "",
				type: "tuple",
				internalType: "struct WriterStorage.Entry",
				components: [
					{
						name: "createdAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "updatedAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "chunks",
						type: "string[]",
						internalType: "string[]",
					},
					{
						name: "totalChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "receivedChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "exists",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "author",
						type: "address",
						internalType: "address",
					},
				],
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "createWithChunk",
		inputs: [
			{
				name: "totalChunks",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "content",
				type: "string",
				internalType: "string",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "",
				type: "tuple",
				internalType: "struct WriterStorage.Entry",
				components: [
					{
						name: "createdAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "updatedAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "chunks",
						type: "string[]",
						internalType: "string[]",
					},
					{
						name: "totalChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "receivedChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "exists",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "author",
						type: "address",
						internalType: "address",
					},
				],
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "entries",
		inputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "createdAtBlock",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "updatedAtBlock",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "totalChunks",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "receivedChunks",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "exists",
				type: "bool",
				internalType: "bool",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "entryIdCounter",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "entryIdToEntryIdsIndex",
		inputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "entryIds",
		inputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntry",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct WriterStorage.Entry",
				components: [
					{
						name: "createdAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "updatedAtBlock",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "chunks",
						type: "string[]",
						internalType: "string[]",
					},
					{
						name: "totalChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "receivedChunks",
						type: "uint256",
						internalType: "uint256",
					},
					{
						name: "exists",
						type: "bool",
						internalType: "bool",
					},
					{
						name: "author",
						type: "address",
						internalType: "address",
					},
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryContent",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "string",
				internalType: "string",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryCount",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryIds",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256[]",
				internalType: "uint256[]",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryTotalChunks",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getRoleAdmin",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		outputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "grantRole",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "hasRole",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "logic",
		inputs: [],
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
		name: "remove",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "renounceRole",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "callerConfirmation",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "replaceAdmin",
		inputs: [
			{
				name: "newAdmin",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "revokeRole",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				internalType: "bytes32",
			},
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setLogic",
		inputs: [
			{
				name: "newLogic",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "supportsInterface",
		inputs: [
			{
				name: "interfaceId",
				type: "bytes4",
				internalType: "bytes4",
			},
		],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "update",
		inputs: [
			{
				name: "id",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "totalChunks",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "content",
				type: "string",
				internalType: "string",
			},
			{
				name: "author",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "ChunkReceived",
		inputs: [
			{
				name: "author",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "id",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "index",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "content",
				type: "string",
				indexed: false,
				internalType: "string",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "EntryCompleted",
		inputs: [
			{
				name: "id",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "EntryCreated",
		inputs: [
			{
				name: "id",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "EntryRemoved",
		inputs: [
			{
				name: "id",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "EntryUpdated",
		inputs: [
			{
				name: "id",
				type: "uint256",
				indexed: true,
				internalType: "uint256",
			},
			{
				name: "author",
				type: "address",
				indexed: false,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "LogicSet",
		inputs: [
			{
				name: "logicAddress",
				type: "address",
				indexed: true,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "RoleAdminChanged",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
			{
				name: "previousAdminRole",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
			{
				name: "newAdminRole",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "RoleGranted",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
			{
				name: "account",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "sender",
				type: "address",
				indexed: true,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "RoleRevoked",
		inputs: [
			{
				name: "role",
				type: "bytes32",
				indexed: true,
				internalType: "bytes32",
			},
			{
				name: "account",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "sender",
				type: "address",
				indexed: true,
				internalType: "address",
			},
		],
		anonymous: false,
	},
	{
		type: "error",
		name: "AccessControlBadConfirmation",
		inputs: [],
	},
	{
		type: "error",
		name: "AccessControlUnauthorizedAccount",
		inputs: [
			{
				name: "account",
				type: "address",
				internalType: "address",
			},
			{
				name: "neededRole",
				type: "bytes32",
				internalType: "bytes32",
			},
		],
	},
] as const;
