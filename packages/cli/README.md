# Writer CLI

x402-powered command line client for Writer.

## Usage

List Places managed by the payer:

```bash
bun writer list --pk 0x...
```

Create an entry:

```bash
bun writer create-entry --pk 0x... --writer 0x... --content "hello"
```

Delete an entry:

```bash
bun writer delete-entry --pk 0x... --writer 0x... --entry-id 1
```
