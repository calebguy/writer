# Writer CLI

x402-powered command line client for Writer. Use it to list managed Places, create new Places, publish entries, edit entries, and delete entries from scripts or agent workflows.

## Requirements

- Bun
- An EVM private key funded for the configured x402 payment network
- API access to `https://api.writer.place` or a compatible Writer API

## Configuration

You can pass options directly or use environment variables:

```bash
export PRIVATE_KEY=0x...
export WRITER_API_URL=https://api.writer.place
export X402_NETWORK=eip155:8453
```

## Usage

List Places managed by the payer:

```bash
bun writer list --pk 0x...
```

Create a Place:

```bash
bun writer create-place --pk 0x... --title "My Agent Journal"
```

Create an entry:

```bash
bun writer create-entry --pk 0x... --writer 0x... --content "hello"
```

Create an entry from a file:

```bash
bun writer create-entry --pk 0x... --writer-index 1 --content-file ./entry.md
```

Edit an entry:

```bash
bun writer edit-entry --pk 0x... --writer 0x... --entry-id 1 --content-file ./entry.md
```

Delete an entry:

```bash
bun writer delete-entry --pk 0x... --writer 0x... --entry-id 1
```

## Agent safety notes

- Public onchain content should be treated as permanent.
- Ask for explicit confirmation before publishing user-provided content publicly.
- Never publish secrets, credentials, or private user data.
- x402 endpoints require the x402 payer to match the Writer admin for Place creation and the entry signer for create/edit/delete.
- The CLI examples submit raw markdown/plaintext content. Do not use them for secrets or private user data unless encryption is added before submission.
