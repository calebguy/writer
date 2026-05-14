# Example: Edit a Writer Entry

Use this when the user has approved exact replacement content for an existing entry.

## Confirm first

Ask:

> Please confirm you want to replace entry `1` in Writer Place `0x...` with this exact content. Writer edits are onchain updates and this action requires an x402 payment.

## Write replacement content to a file

```bash
cat > /tmp/writer-entry-edit.md <<'EOF'
Your approved replacement markdown content goes here.
EOF
```

## Command

```bash
bun writer edit-entry \
  --pk "$PRIVATE_KEY" \
  --writer 0x... \
  --entry-id 1 \
  --content-file /tmp/writer-entry-edit.md
```

## Report back

Summarize:

- Place address
- Entry id
- Pending update transaction id
- Payment settlement response
- Whether the update is still pending indexing
