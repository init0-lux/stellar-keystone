# Stellar Keystone CLI

Command-line tool for deploying and managing RBAC contracts on Soroban.

## Installation

```bash
npm install -g @stellar-keystone/cli
# or
npx @stellar-keystone/cli --help
```

## Quick Start

```bash
export SIGNER_KEY=SXXX...
rbac deploy --network testnet
rbac create-role --contract CXXX... --role WITHDRAWER --admin DEF_ADMIN
rbac grant --contract CXXX... --role WITHDRAWER --address GXXX...
rbac has-role --contract CXXX... --role WITHDRAWER --address GXXX... --json
```

## Commands

| Command | Description |
|---------|-------------|
| `deploy` | Deploy new RBAC contract |
| `create-role` | Create a role with admin |
| `grant` | Grant role (with optional `--expiry`) |
| `revoke` | Revoke role from account |
| `has-role` | Check role (exit codes: 0=has, 1=no, 2=error) |
| `list-members` | List role members (requires indexer running) |
| `lint` | Run configuration checks |

## Common Workflows

**Deploy and setup:**
```bash
CONTRACT_ID=$(rbac deploy --network testnet | grep "Contract ID" | awk '{print $3}')
rbac create-role --contract $CONTRACT_ID --role OPERATOR --admin DEF_ADMIN
rbac grant --contract $CONTRACT_ID --role OPERATOR --address GXXX...
```

**Check with JSON output:**
```bash
rbac has-role --contract $CONTRACT_ID --role OPERATOR --address GXXX... --json
# {"hasRole": true, "role": "OPERATOR", "account": "GXXX..."}
```

## Configuration

**Signing keys:** Use `SIGNER_KEY` env var or `--key-env` flag  
**Networks:** `local` (http://127.0.0.1:8000) or `testnet`

## Troubleshooting

- **"Contract not found"** → Verify contract ID and network
- **"Not authorized"** → Ensure signer has admin role
- **"Indexer database not found"** → Start indexer first (see [indexer/README.md](../indexer/README.md))

## See Also

- [RBAC Contract](../rbac/README.md) | [Indexer](../indexer/README.md) | [SDK](../js-sdk/README.md)
