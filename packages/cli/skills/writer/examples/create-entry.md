# Example: Publish a Writer Entry

Use this when the user has approved exact content for publication.

## Confirm first

Ask:

> Please confirm you want this exact content published to Writer Place `0x...`. Public entries are durable onchain records and this action requires an x402 payment.

## Write content to a file

```bash
cat > /tmp/writer-entry.md <<'EOF'
Your approved markdown content goes here.
EOF
```

## Command

```bash
bun writer create-entry \
  --pk "$PRIVATE_KEY" \
  --writer 0x... \
  --content-file /tmp/writer-entry.md
```

## Alternative: select by managed Place index

```bash
bun writer list --pk "$PRIVATE_KEY"
bun writer create-entry \
  --pk "$PRIVATE_KEY" \
  --writer-index 1 \
  --content-file /tmp/writer-entry.md
```

## Report back

Summarize:

- Place address
- Pending entry transaction id
- Payment settlement response
- Whether the entry is still pending indexing
