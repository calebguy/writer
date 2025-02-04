export const factoryCreate = `
\`\`\`solidity
function create(string calldata title, address admin, address[] memory managers, bytes32 salt) 
	returns (address writerAddress, address storageAddress)
\`\`\`
`;

export const factoryComputeWriterStorageAddress = `
\`\`\`solidity
function computeWriterStorageAddress(bytes32 salt) 
	returns (address storageAddress)
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

export const entryStruct = `
\`\`\`solidity
struct Entry {
	uint256 createdAtBlock;
	uint256 updatedAtBlock;
	string[] chunks;
	uint256 totalChunks;
	uint256 receivedChunks;
	bool exists;
	address author;
}
\`\`\`
`;

export const writerCreate = `
\`\`\`solidity
function create(uint256 chunkCount) 
	returns (uint256 entryId, Entry entry)
\`\`\`
`;

export const writerAddChunk = `
\`\`\`solidity
function addChunk(uint256 id, uint256 index, string calldata content) 
	returns (Entry entry)
\`\`\`
`;

export const writerCreateWithChunk = `
\`\`\`solidity
function createWithChunk(uint256 chunkCount, string calldata content) 
	returns (uint256 entryId, WriterStorage.Entry memory entry)
\`\`\`
`;

export const writerUpdate = `
\`\`\`solidity
function update(uint256 id, uint256 totalChunks, string calldata content)
	returns (Entry entry)
\`\`\`
`;

export const writerRemove = `
\`\`\`solidity
function remove(uint256 id)
\`\`\`
`;

export const writerCreateWithSig = `
\`\`\`solidity
function createWithSig(bytes memory signature, uint256 nonce, uint256 chunkCount)
	returns (uint256 entryId, Entry entry)
\`\`\`
`;

export const writerAddChunkWithSig = `
\`\`\`solidity
function addChunkWithSig(bytes memory signature, uint256 nonce, uint256 id, uint256 index, string calldata content)
	returns (Entry entry)
\`\`\`
`;

export const writerCreateWithChunkWithSig = `
\`\`\`solidity
function createWithChunkWithSig(bytes memory signature, uint256 nonce, uint256 chunkCount, string calldata content)
	returns (uint256 entryId, WriterStorage.Entry memory entry)
\`\`\`
`;

export const writerUpdateWithSig = `
\`\`\`solidity
function updateWithSig(bytes memory signature, uint256 nonce, uint256 id, uint256 totalChunks, string calldata content)
	returns (Entry entry)
\`\`\`
`;

export const writerRemoveWithSig = `
\`\`\`solidity
function removeWithSig(bytes memory signature, uint256 nonce, uint256 id)
\`\`\`
`;

export const entryCreatedEvent = `
\`\`\`solidity
event EntryCreated(
	uint256 indexed id,
	address indexed author
);
\`\`\`
`;

export const entryUpdatedEvent = `
\`\`\`solidity
event EntryUpdated(
	uint256 indexed id,
	address indexed author
);
\`\`\`
`;

export const entryRemovedEvent = `
\`\`\`solidity
event EntryRemoved(
	uint256 indexed id,
	address indexed author
);
\`\`\`
`;

export const entryCompletedEvent = `
\`\`\`solidity
event EntryCompleted(
	uint256 indexed id,
	address indexed author
);
\`\`\`
`;

export const chunkReceivedEvent = `
\`\`\`solidity
event ChunkReceived(
	address indexed author,
	uint256 indexed id,
	uint256 indexed index,
	string content
);
\`\`\`
`;

export const writerSetTitle = `
\`\`\`solidity
function setTitle(string calldata newTitle) external onlyRole(DEFAULT_ADMIN_ROLE) {
    title = newTitle;
    emit TitleSet(newTitle);
}
\`\`\`
`;

export const writerSetTitleWithSig = `
\`\`\`solidity
function setTitleWithSig(
    bytes memory signature,
    uint256 nonce,
    string calldata newTitle
) external signedByWithRole(
    signature,
    keccak256(abi.encode(SET_TITLE_TYPEHASH, nonce, keccak256(abi.encodePacked(newTitle)))),
    DEFAULT_ADMIN_ROLE
) {
    title = newTitle;
    emit TitleSet(newTitle);
}
\`\`\`
`;

export const writerGetEntryCount = `
\`\`\`solidity
function getEntryCount() 
	returns (uint256)
\`\`\`
`;

export const writerGetEntryIds = `
\`\`\`solidity
function getEntryIds() 
	returns (uint256[] memory)
\`\`\`
`;

export const writerGetEntry = `
\`\`\`solidity
function getEntry(uint256 id) 
	returns (WriterStorage.Entry memory)
\`\`\`
`;

export const writerGetEntryContent = `
\`\`\`solidity
function getEntryContent(uint256 id) 
	returns (string memory)
\`\`\`
`;

export const writerGetEntryChunk = `
\`\`\`solidity
function getEntryChunk(uint256 id, uint256 index) 
	returns (string memory)
\`\`\`
`;

export const writerGetEntryTotalChunks = `
\`\`\`solidity
function getEntryTotalChunks(uint256 id) 
	returns (uint256)
\`\`\`
`;

export const baseUrlSnipped = `
\`\`\`bash
https://api.writer.com
\`\`\`
`;

export const writerObjectSnippet = `
\`\`\`json
{
	"address": "0x7DFD8994dA66053a05103c5bc0b07530Ae8e980D",
	"storageAddress": "0x135FfF999D92B1FC1f3Ad28feda4F035C93d7aA3",
	"title": "## This week was tough",
	"admin": "0x45C39E8B9Cb28e2B6CdcDa5577385DE3Ee002694",
	"managers": [
			"0x45C39E8B9Cb28e2B6CdcDa5577385DE3Ee002694"
	],
	"isPrivate": false,
	"createdAtHash": "0xc243d0a332a7b61ff46836b89c0eccce67db9d376c8c927ed16b60a79c292752",
	"createdAtBlock": "131466750",
	"createdAtBlockDatetime": "2025-02-02T21:37:57.000Z",
	"createdAt": "2025-02-02T21:37:54.437Z",
	"updatedAt": "2025-02-03T21:35:52.140Z",
	"transactionId": "85ba7fb4-f2b2-4846-9ccf-8048c95b9746",
	"entries": [
		{
			"id": 52,
			"exists": true,
			"onChainId": "1",
			"version": "br",
			"raw": "br:GyUA+CXDzuZaEEIK0UQDQ05MOikX9r2Ion8G",
			"decompressed": "testing a message with really high gas",
			"author": "0x45C39E8B9Cb28e2B6CdcDa5577385DE3Ee002694",
			"createdAtHash": "0x554e9490d09a2627a6d0a3ab98d8add0bb3b92c24003d06452716f2768047e5d",
			"createdAtBlock": "131475636",
			"createdAtBlockDatetime": "2025-02-03T02:34:09.000Z",
			"deletedAtHash": null,
			"deletedAtBlockDatetime": null,
			"createdAt": "2025-02-03T02:34:06.886Z",
			"updatedAt": "2025-02-03T21:35:52.620Z",
			"deletedAt": null,
			"storageAddress": "0x135FfF999D92B1FC1f3Ad28feda4F035C93d7aA3",
			"createdAtTransactionId": "174785e7-3448-4d50-a670-d9761f6384be",
			"deletedAtTransactionId": null,
			"updatedAtTransactionId": null
		}
	]
}
\`\`\`
`;

export const entryObjectSnippet = `
\`\`\`json
{
	"id": 52,
	"exists": true,
	"onChainId": "1",
	"version": "br",
	"raw": "br:GyUA+CXDzuZaEEIK0UQDQ05MOikX9r2Ion8G",
	"decompressed": "testing a message with really high gas",
	"author": "0x45C39E8B9Cb28e2B6CdcDa5577385DE3Ee002694",
	"createdAtHash": "0x554e9490d09a2627a6d0a3ab98d8add0bb3b92c24003d06452716f2768047e5d",
	"createdAtBlock": "131475636",
	"createdAtBlockDatetime": "2025-02-03T02:34:09.000Z",
	"deletedAtHash": null,
	"deletedAtBlockDatetime": null,
	"createdAt": "2025-02-03T02:34:06.886Z",
	"updatedAt": "2025-02-03T21:35:52.620Z",
	"deletedAt": null,
	"storageAddress": "0x135FfF999D92B1FC1f3Ad28feda4F035C93d7aA3",
	"createdAtTransactionId": "174785e7-3448-4d50-a670-d9761f6384be",
	"deletedAtTransactionId": null,
	"updatedAtTransactionId": null
}
\`\`\`
`;
