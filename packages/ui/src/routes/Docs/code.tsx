export const factoryCreate = `
\`\`\`solidity
function create(string calldata title, address admin, address[] memory managers, bytes32 salt) 
	returns (address writerAddress, address storeAddress)
\`\`\`
`;

export const factoryComputeWriterStorageAddress = `
\`\`\`solidity
function computeWriterStorageAddress(bytes32 salt) 
	returns (address)
\`\`\`
`;

export const factoryComputeWriterAddress = `
\`\`\`solidity
function computeWriterAddress(string title, address admin, address[] managers, bytes32 salt)
	returns (address writerAddress)
\`\`\`
`;

export const writerCreatedEvent = `
\`\`\`solidity
event WriterCreated(
	address indexed writerAddress,
	address indexed storeAddress,
	address indexed admin,
	string title,
	address[] managers
);
\`\`\`
`;
