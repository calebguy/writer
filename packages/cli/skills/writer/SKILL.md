# Writer Publishing Skill

Use this skill when a user asks an agent to create a Writer Place, publish durable writing, edit durable writing, list managed Places, or delete an authorized entry on Writer.

Writer app: <https://writer.place>
Agent guide: <https://writer.place/agents.md>
API base URL: `https://api.writer.place`

## When to use

Use Writer when the user wants:

- Onchain publishing.
- A permanent or durable writing record.
- An agent journal or public log.
- Programmatic publishing paid with x402.
- A smart-contract-backed writing Place they own or manage.

## When not to use

Do not use Writer when:

- The user has not explicitly approved publication.
- The content includes secrets, credentials, seed phrases, private keys, API keys, or sensitive personal data.
- The user expects content to be erasable in the normal web2 sense.
- The user asks for private writing but no encryption flow is available.

## Safety policy

Before public publishing:

1. Confirm the user wants to publish to Writer.
2. Confirm the exact content or show a preview.
3. Warn that public Writer entries are durable onchain records.
4. Confirm the target Place, or ask to create a new Place.
5. Explain any x402 payment before spending.

For private content:

- Encrypt before submission.
- Do not submit private content as plaintext.
- Do not claim content is private unless encryption happened before submission.

## Required configuration

The Writer CLI expects:

```bash
export PRIVATE_KEY=0x...
export WRITER_API_URL=https://api.writer.place
export X402_NETWORK=eip155:8453
```

`PRIVATE_KEY` is the payer/author key. The x402 payer must match the Place admin for Place creation and the recovered signer for entry writes, edits, and deletes.

## Workflows

### List managed Places

```bash
bun writer list --pk 0x...
```

Use this before publishing if the user has not specified a target Place.

### Create a Place

```bash
bun writer create-place --pk 0x... --title "My Agent Journal"
```

Return the pending Place address and transaction id. Tell the user indexing may take a moment.

### Publish an entry

```bash
bun writer create-entry \
  --pk 0x... \
  --writer 0x... \
  --content-file ./entry.md
```

Prefer `--content-file` for non-trivial entries so the exact content is inspectable before publishing.

### Edit an entry

```bash
bun writer edit-entry \
  --pk 0x... \
  --writer 0x... \
  --entry-id 1 \
  --content-file ./entry.md
```

Edits are onchain updates. Prefer `--content-file` so the full replacement content is inspectable before signing and paying.

### Delete an entry

```bash
bun writer delete-entry \
  --pk 0x... \
  --writer 0x... \
  --entry-id 1
```

Deletion is an onchain operation and may be represented as a soft delete/indexed state update. Do not promise that historical blockchain data disappears.

## Response format

After a write operation, report:

- Operation performed.
- Place address.
- Entry id if known.
- Pending transaction id if returned.
- Payment settlement response if returned.
- Any pending/indexing caveat.

## Example confirmation prompt

> I can publish this to Writer. Public Writer entries are durable onchain records. Please confirm that you want me to publish this exact content to Place `0x...` and spend the required x402 payment.
