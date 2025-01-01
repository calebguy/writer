export const WriterAbi = [
	{
		type: "constructor",
		inputs: [
			{
				name: "newTitle",
				type: "string",
				internalType: "string",
			},
			{
				name: "storageAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "admin",
				type: "address",
				internalType: "address",
			},
			{
				name: "writers",
				type: "address[]",
				internalType: "address[]",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "ADD_CHUNK_TYPEHASH",
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
		name: "CREATE_TYPEHASH",
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
		name: "CREATE_WITH_CHUNK_TYPEHASH",
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
		name: "DOMAIN_NAME",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bytes",
				internalType: "bytes",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "DOMAIN_VERSION",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bytes",
				internalType: "bytes",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "REMOVE_TYPEHASH",
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
		name: "SET_TITLE_TYPEHASH",
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
		name: "UPDATE_TYPEHASH",
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
		name: "WRITER_ROLE",
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
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkIndex",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "addChunkWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkIndex",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
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
				name: "chunkCount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "createWithChunk",
		inputs: [
			{
				name: "chunkCount",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "createWithChunkWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkCount",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "createWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkCount",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
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
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryChunk",
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
		name: "remove",
		inputs: [
			{
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "removeWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
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
		name: "setStorage",
		inputs: [
			{
				name: "storageAddress",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setTitle",
		inputs: [
			{
				name: "newTitle",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setTitleWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "newTitle",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "signatureWasExecuted",
		inputs: [
			{
				name: "",
				type: "bytes32",
				internalType: "bytes32",
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
		name: "store",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract WriterStorage",
			},
		],
		stateMutability: "view",
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
		name: "title",
		inputs: [],
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
		name: "update",
		inputs: [
			{
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkIndex",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "updateWithSig",
		inputs: [
			{
				name: "signature",
				type: "bytes",
				internalType: "bytes",
			},
			{
				name: "nonce",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "entryId",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkIndex",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "chunkContent",
				type: "string",
				internalType: "string",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
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
		type: "event",
		name: "StorageSet",
		inputs: [
			{
				name: "storageAddress",
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
