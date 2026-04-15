import { parseAbiItem, toEventSelector } from "viem";

// WriterFactory events (new factory includes publicWritable, old does not)
export const NEW_WRITER_CREATED = parseAbiItem(
	"event WriterCreated(address indexed writerAddress, address indexed storeAddress, address indexed admin, string title, address[] managers, bool publicWritable)",
);
export const OLD_WRITER_CREATED = parseAbiItem(
	"event WriterCreated(address indexed writerAddress, address indexed storeAddress, address indexed admin, string title, address[] managers)",
);

// WriterStorage events
export const ENTRY_CREATED = parseAbiItem(
	"event EntryCreated(uint256 indexed id, address author)",
);
export const CHUNK_RECEIVED = parseAbiItem(
	"event ChunkReceived(address indexed author, uint256 indexed id, uint256 indexed index, string content)",
);
export const ENTRY_UPDATED = parseAbiItem(
	"event EntryUpdated(uint256 indexed id, address author)",
);
export const ENTRY_REMOVED = parseAbiItem(
	"event EntryRemoved(uint256 indexed id, address author)",
);
export const LOGIC_SET = parseAbiItem(
	"event LogicSet(address indexed logicAddress)",
);

// ColorRegistry events
export const HEX_SET = parseAbiItem(
	"event HexSet(address indexed user, bytes32 indexed hexColor)",
);

// Pre-compute topic0 selectors
export const TOPIC0 = {
	NEW_WRITER_CREATED: toEventSelector(NEW_WRITER_CREATED),
	OLD_WRITER_CREATED: toEventSelector(OLD_WRITER_CREATED),
	ENTRY_CREATED: toEventSelector(ENTRY_CREATED),
	CHUNK_RECEIVED: toEventSelector(CHUNK_RECEIVED),
	ENTRY_UPDATED: toEventSelector(ENTRY_UPDATED),
	ENTRY_REMOVED: toEventSelector(ENTRY_REMOVED),
	LOGIC_SET: toEventSelector(LOGIC_SET),
	HEX_SET: toEventSelector(HEX_SET),
} as const;

// All event ABIs as a flat array for use with decodeEventLog
export const ALL_EVENTS = [
	NEW_WRITER_CREATED,
	OLD_WRITER_CREATED,
	ENTRY_CREATED,
	CHUNK_RECEIVED,
	ENTRY_UPDATED,
	ENTRY_REMOVED,
	LOGIC_SET,
	HEX_SET,
] as const;
