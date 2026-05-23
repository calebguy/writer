import { parseAbiItem, toEventSelector } from "viem";

// WriterFactory events. The current factory includes publicWritable, the
// previous factory omits it, and the earliest factories included an indexed
// numeric id while storing storeAddress in the event data.
export const NEW_WRITER_CREATED = parseAbiItem(
	"event WriterCreated(address indexed writerAddress, address indexed storeAddress, address indexed admin, string title, address[] managers, bool publicWritable)",
);
export const OLD_WRITER_CREATED = parseAbiItem(
	"event WriterCreated(address indexed writerAddress, address indexed storeAddress, address indexed admin, string title, address[] managers)",
);
export const LEGACY_WRITER_CREATED_WITH_ID = parseAbiItem(
	"event WriterCreated(uint256 indexed id, address indexed writerAddress, address indexed admin, string title, address storeAddress, address[] managers)",
);

// WriterStorage events
export const ENTRY_CREATED = parseAbiItem(
	"event EntryCreated(uint256 indexed id, address author)",
);
export const CHUNK_RECEIVED = parseAbiItem(
	"event ChunkReceived(address indexed author, uint256 indexed id, uint256 indexed index, string content)",
);
export const LEGACY_CHUNK_RECEIVED = parseAbiItem(
	"event ChunkReceived(uint256 indexed id, uint256 index, string content, address author)",
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
export const TITLE_SET = parseAbiItem("event TitleSet(string indexed title)");

// ColorRegistry events
export const HEX_SET = parseAbiItem(
	"event HexSet(address indexed user, bytes32 indexed hexColor)",
);

// Pre-compute topic0 selectors
export const TOPIC0 = {
	NEW_WRITER_CREATED: toEventSelector(NEW_WRITER_CREATED),
	OLD_WRITER_CREATED: toEventSelector(OLD_WRITER_CREATED),
	LEGACY_WRITER_CREATED_WITH_ID: toEventSelector(
		LEGACY_WRITER_CREATED_WITH_ID,
	),
	ENTRY_CREATED: toEventSelector(ENTRY_CREATED),
	CHUNK_RECEIVED: toEventSelector(CHUNK_RECEIVED),
	LEGACY_CHUNK_RECEIVED: toEventSelector(LEGACY_CHUNK_RECEIVED),
	ENTRY_UPDATED: toEventSelector(ENTRY_UPDATED),
	ENTRY_REMOVED: toEventSelector(ENTRY_REMOVED),
	LOGIC_SET: toEventSelector(LOGIC_SET),
	HEX_SET: toEventSelector(HEX_SET),
	TITLE_SET: toEventSelector(TITLE_SET),
} as const;

// All event ABIs as a flat array for use with decodeEventLog
export const ALL_EVENTS = [
	NEW_WRITER_CREATED,
	OLD_WRITER_CREATED,
	LEGACY_WRITER_CREATED_WITH_ID,
	ENTRY_CREATED,
	CHUNK_RECEIVED,
	LEGACY_CHUNK_RECEIVED,
	ENTRY_UPDATED,
	ENTRY_REMOVED,
	LOGIC_SET,
	HEX_SET,
	TITLE_SET,
] as const;
