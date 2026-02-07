# Stellar Keystone CLI

Command-line tool for deploying and managing RBAC contracts on Soroban.

## Installation

```bash
# Global install
npm install -g @stellar-keystone/cli

# Or use npx
npx @stellar-keystone/cli --help
```

## Quick Start

```bash
# Set your signing key
export SIGNER_KEY=SXXX...

# Deploy RBAC contract
rbac deploy --network testnet

# Create a role
rbac create-role --contract CXXX... --role WITHDRAWER --admin DEF_ADMIN --network testnet

# Grant role to account
rbac grant --contract CXXX... --role WITHDRAWER --address GXXX... --network testnet

# Check if account has role
rbac has-role --contract CXXX... --role WITHDRAWER --address GXXX... --network testnet
```

## Commands

### `deploy`
Deploy a new RBAC contract.

```bash
rbac deploy --network testnet
rbac deploy --network local --key-env MY_SIGNER_KEY
```

### `create-role`
Create a new role in the RBAC contract.

```bash
rbac create-role --contract CXXX... --role OPERATOR --admin DEF_ADMIN
```

### `grant`
Grant a role to an account.

```bash
# Permanent grant
rbac grant --contract CXXX... --role OPERATOR --address GXXX...

# With expiry
rbac grant --contract CXXX... --role OPERATOR --address GXXX... --expiry 2026-12-31T23:59:59Z
```

### `revoke`
Revoke a role from an account.

```bash
rbac revoke --contract CXXX... --role OPERATOR --address GXXX...
```

### `has-role`
Check if an account has a specific role.

```bash
rbac has-role --contract CXXX... --role OPERATOR --address GXXX...
rbac has-role --contract CXXX... --role OPERATOR --address GXXX... --json
```

Exit codes: 0 = has role, 1 = doesn't have role, 2 = error

### `list-members`
List all members of a role (requires the indexer to be running).

```bash
rbac list-members --contract CXXX... --role OPERATOR --db ./indexer.db
```

### `lint`
Run configuration checks on an RBAC contract.

```bash
rbac lint --contract CXXX... --db ./indexer.db
```

Checks:
- Default admin usage
- Missing expiry on grants
- Orphaned roles
- Circular admin dependencies

## Configuration

### Signing Keys

By default, the CLI reads from `SIGNER_KEY` environment variable:

```bash
export SIGNER_KEY=SXXX...
rbac deploy --network testnet
```

Use `--key-env` to specify a different variable:

```bash
export MY_KEY=SXXX...
rbac deploy --network testnet --key-env MY_KEY
```

### Networks

- `local` - Local Soroban network (http://127.0.0.1:8000)
- `testnet` - Stellar testnet

## Common Workflows

### Deploy and Setup

```bash
# 1. Deploy contract
CONTRACT_ID=$(rbac deploy --network testnet | grep "Contract ID" | awk '{print $3}')

# 2. Create roles
rbac create-role --contract $CONTRACT_ID --role WITHDRAWER --admin DEF_ADMIN
rbac create-role --contract $CONTRACT_ID --role OPERATOR --admin DEF_ADMIN

# 3. Grant roles
rbac grant --contract $CONTRACT_ID --role OPERATOR --address GXXX...
```

### Check Role Status

```bash
# Check with JSON output for scripting
rbac has-role --contract $CONTRACT_ID --role OPERATOR --address GXXX... --json

# Example output:
# {"hasRole": true, "role": "OPERATOR", "account": "GXXX..."}
```

## Troubleshooting

**Error: "Contract not found"**
- Verify contract ID is correct
- Check network setting matches deployment

**Error: "Not authorized"**
- Ensure SIGNER_KEY has admin role for the operation
- Check role hierarchy (only role admins can grant/revoke)

**Error: "Indexer database not found"**
- Start the indexer first (see ../indexer/README.md)
- Verify --db path is correct

## See Also

- [RBAC Contract](../rbac/README.md) - Contract documentation
- [Indexer](../indexer/README.md) - Event indexing for list-members/lint
- [SDK](../js-sdk/README.md) - Programmatic access

## License

MIT
