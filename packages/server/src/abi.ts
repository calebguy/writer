export const proseAbi = [
	{
		type: "constructor",
		inputs: [{ name: "_admin", type: "address", internalType: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "DEFAULT_ADMIN_ROLE",
		inputs: [],
		outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "create",
		inputs: [{ name: "content", type: "string", internalType: "string" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "entries",
		inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		outputs: [
			{ name: "block", type: "uint256", internalType: "uint256" },
			{ name: "content", type: "string", internalType: "string" },
			{ name: "exists", type: "bool", internalType: "bool" },
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "entryCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "entryIds",
		inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntry",
		inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
		outputs: [
			{
				name: "",
				type: "tuple",
				internalType: "struct Prose.Entry",
				components: [
					{ name: "block", type: "uint256", internalType: "uint256" },
					{ name: "content", type: "string", internalType: "string" },
					{ name: "exists", type: "bool", internalType: "bool" },
				],
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEntryIds",
		inputs: [],
		outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getRoleAdmin",
		inputs: [{ name: "role", type: "bytes32", internalType: "bytes32" }],
		outputs: [{ name: "", type: "bytes32", internalType: "bytes32" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "grantRole",
		inputs: [
			{ name: "role", type: "bytes32", internalType: "bytes32" },
			{ name: "account", type: "address", internalType: "address" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "hasRole",
		inputs: [
			{ name: "role", type: "bytes32", internalType: "bytes32" },
			{ name: "account", type: "address", internalType: "address" },
		],
		outputs: [{ name: "", type: "bool", internalType: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "remove",
		inputs: [{ name: "id", type: "uint256", internalType: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "renounceRole",
		inputs: [
			{ name: "role", type: "bytes32", internalType: "bytes32" },
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
		name: "revokeRole",
		inputs: [
			{ name: "role", type: "bytes32", internalType: "bytes32" },
			{ name: "account", type: "address", internalType: "address" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "supportsInterface",
		inputs: [{ name: "interfaceId", type: "bytes4", internalType: "bytes4" }],
		outputs: [{ name: "", type: "bool", internalType: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "update",
		inputs: [
			{ name: "id", type: "uint256", internalType: "uint256" },
			{ name: "content", type: "string", internalType: "string" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "EntryCreated",
		inputs: [
			{ name: "id", type: "uint256", indexed: true, internalType: "uint256" },
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
		name: "EntryRemoved",
		inputs: [
			{ name: "id", type: "uint256", indexed: true, internalType: "uint256" },
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "EntryUpdated",
		inputs: [
			{ name: "id", type: "uint256", indexed: true, internalType: "uint256" },
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
	{ type: "error", name: "AccessControlBadConfirmation", inputs: [] },
	{
		type: "error",
		name: "AccessControlUnauthorizedAccount",
		inputs: [
			{ name: "account", type: "address", internalType: "address" },
			{ name: "neededRole", type: "bytes32", internalType: "bytes32" },
		],
	},
];
