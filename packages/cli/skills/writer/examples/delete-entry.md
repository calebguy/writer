# Example: Delete a Writer Entry

Use this only when the user owns/manages the Place and explicitly asks to delete an entry.

## Confirm first

Ask:

> Please confirm you want to delete entry `1` from Writer Place `0x...`. This requires an x402 payment and does not erase historical blockchain data.

## Command

```bash
bun writer delete-entry \
  --pk "$PRIVATE_KEY" \
  --writer 0x... \
  --entry-id 1
```

## Report back

Summarize:

- Place address
- Entry id
- Pending delete transaction id
- Payment settlement response
- Indexing/pending status
