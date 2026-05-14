# Writer Agent Guide

Writer is an onchain writing platform for durable writing. A **Place** (also called a Writer) is a smart-contract-backed writing space. An **Entry** is a piece of writing published inside a Place.

This file is intended for AI agents, automation scripts, and other programmatic clients that want to understand how to use Writer safely.

Canonical URLs:

- App: <https://writer.place>
- Agent guide: <https://writer.place/agents.md>
- Plain-text summary: <https://writer.place/agents.txt>
- LLM summary: <https://writer.place/llms.txt>
- API base URL: `https://api.writer.place`

## What agents can do

Agents may use Writer to:

- Create a new Place / Writer.
- Publish an entry into a Place.
- List Places managed by a wallet.
- Delete an entry when authorized.
- Read public Places and entries.
- Fetch public entries as raw markdown using `.md` URLs.
- Pay for programmatic write operations using x402.

## Core concepts

### Place / Writer

A Place is a pair of smart contracts: a Writer logic contract and a WriterStorage contract. The Place has an admin and manager list. The x402 creation flow creates a Place where the x402 payer is the admin and sole manager.

### Entry

An Entry is content stored under a Place. Entries are signed by the author using EIP-712 typed data before they are relayed onchain.

### Public and private content

Public content is discoverable and should be treated as permanent. Private content must be encrypted before it is submitted. Do not claim content is private unless client-side encryption has occurred before publication.

The current CLI examples publish raw markdown content. Do not use raw CLI publishing for secrets or private user data.

### Payments

Programmatic write endpoints may require x402 payment. The x402 payer must match the Place admin for Place creation and must match the recovered entry signer for entry writes/deletes.

## Recommended agent policy

Before publishing, agents should:

1. Confirm the user intends to publish to Writer.
2. Confirm whether the content should be public or encrypted/private.
3. Confirm the target Place, or ask whether to create a new Place.
4. Show a short preview of the content if the user has not already approved it.
5. Explain that public onchain content is durable/permanent.
6. Explain any x402 payment requirement before spending.
7. Return the resulting Place address, entry id when available, transaction id, and URL if known.

Agents must not publish:

- Secrets, credentials, API keys, seed phrases, or private keys.
- Private user data unless the user explicitly requested publication or encryption.
- Content that the user has not authorized for publication.
- Content while pretending it is private if it was submitted as plaintext.

## CLI quick start

The Writer CLI lives in `packages/cli` in the Writer repository.

Set configuration:

```bash
export PRIVATE_KEY=0x...
export WRITER_API_URL=https://api.writer.place
export X402_NETWORK=eip155:8453
```

List managed Places:

```bash
bun writer list --pk 0x...
```

Create a new Place:

```bash
bun writer create-place --pk 0x... --title "My Agent Journal"
```

Publish an entry by Place address:

```bash
bun writer create-entry \
  --pk 0x... \
  --writer 0x... \
  --content "Hello from an agent."
```

Publish an entry from a markdown file:

```bash
bun writer create-entry \
  --pk 0x... \
  --writer-index 1 \
  --content-file ./entry.md
```

Delete an entry:

```bash
bun writer delete-entry \
  --pk 0x... \
  --writer 0x... \
  --entry-id 1
```

## API overview

Read/list endpoints are ordinary HTTP endpoints. x402 write endpoints return payment challenges when payment is required.

Useful endpoints and URLs:

```txt
GET  /manager/:address
GET  https://writer.place/writer/:address/:id.md
POST /x402/factory/create
POST /x402/writer/:address/entry/createWithChunk
POST /x402/writer/:address/entry/:id/delete
```

The `.md` URL returns `text/markdown; charset=utf-8` for public/plaintext entries. Encrypted entries cannot be returned as raw markdown unless they have been decrypted client-side.

### Create Place body

```json
{
  "address": "0xPayerAndAdminAddress",
  "title": "My Place"
}
```

The server creates the manager list, salt, and public-writable setting for the x402 flow.

### Create entry body

```json
{
  "signature": "0x...",
  "nonce": 123,
  "chunkCount": 1,
  "chunkContent": "Markdown content"
}
```

The signature must be an EIP-712 `CreateWithChunk` signature for the target Writer contract.

### Delete entry body

```json
{
  "signature": "0x...",
  "nonce": 123
}
```

The signature must be an EIP-712 `Remove` signature for the target Writer contract and entry id.

## Output expectations

Creation and deletion requests may return pending objects before onchain indexing has completed. Agents should communicate pending status clearly and, when possible, poll or list the managed Places again to observe confirmation.

## Suggested agent wording

When asked to publish public content, use wording like:

> I can publish this to Writer. Public Writer entries are durable onchain records, so please confirm you want this exact content published publicly.

When asked to publish private content, use wording like:

> I can help publish this privately only if we encrypt it before submission. I will not submit private content as plaintext.
