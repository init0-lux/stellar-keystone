# Stellar Keystone

> Production-grade Role-Based Access Control (RBAC) for Stellar / Soroban

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Soroban SDK](https://img.shields.io/badge/Soroban-25.0.0-brightgreen)](https://soroban.stellar.org)

## Overview

Stellar Keystone is a comprehensive RBAC system designed for Stellar smart contracts. It provides:

- **Soroban Contract**: A reusable RBAC primitive with role hierarchies, expiring grants, and event emission
- **JavaScript SDK**: Type-safe functions for deploying and managing roles
- **CLI**: Command-line tools for administration and configuration linting
- **Indexer**: SQLite-based event indexer for efficient querying
- **Admin UI**: Next.js dashboard for visual role management

## Quick Start

### Prerequisites

- Rust 1.70+ with `wasm32-unknown-unknown` target
- Node.js 20+ and npm
- Soroban CLI
- SQLite3

### Installation

```bash
# Clone the repository
git clone https://github.com/stellar-keystone/stellar-keystone.git
cd stellar-keystone

# Build the RBAC contract
cd rbac && cargo build --release --target wasm32-unknown-unknown

# Install SDK dependencies
cd ../js-sdk && npm install

# Install CLI
cd ../cli && npm install && npm link

# Start the frontend
cd ../frontend && npm install && npm run dev
```

### Deploy Your First Contract

```bash
# Set your signer key
export SIGNER_KEY=SXXX...

# Deploy to testnet
rbac deploy --network testnet --key-env SIGNER_KEY

# Create a role
rbac create-role --contract <CONTRACT_ID> --role WITHDRAWER --admin DEF_ADMIN --key-env SIGNER_KEY

# Grant the role
rbac grant --contract <CONTRACT_ID> --role WITHDRAWER --address GXXX... --key-env SIGNER_KEY
```

## Architecture

```
stellar-keystone/
├── rbac/                   # Soroban RBAC contract
│   └── src/lib.rs
├── examples/
│   └── secure_vault/       # Example contract using RBAC
├── js-sdk/                 # JavaScript/TypeScript SDK
│   └── src/index.ts
├── cli/                    # Command-line interface
│   └── src/index.ts
├── indexer/                # SQLite event indexer
│   └── src/index.ts
├── frontend/               # Next.js admin UI
│   └── app/
└── optional/               # Advanced features
```

## Contract API

### Core Functions

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Initialize contract with admin |
| `create_role(role, admin_role)` | Create a new role |
| `grant_role(role, account, expiry)` | Grant role with optional expiry |
| `revoke_role(role, account)` | Revoke a role |
| `has_role(role, account)` | Check role membership |
| `require_role(role, account)` | Assert role or panic |

### Events

| Event | Description |
|-------|-------------|
| `RoleCreated` | New role defined |
| `RoleGranted` | Role granted to account |
| `RoleRevoked` | Role revoked from account |
| `RoleExpired` | Role expired on access check |
| `RoleAdminChanged` | Role admin updated |

## SDK Usage

```typescript
import { deployRbac, grantRole, hasRole } from '@stellar-keystone/sdk';

// Deploy RBAC contract
const { contractId } = await deployRbac('testnet', signerKey);

// Grant a role with 24-hour expiry
await grantRole(
  contractId,
  'WITHDRAWER',
  userAddress,
  new Date(Date.now() + 86400000).toISOString(),
  signerKey,
  'testnet'
);

// Check role
const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', userAddress, 'testnet');
```

## CLI Reference

```bash
# Deploy contract
rbac deploy --network <local|testnet> --key-env <ENV_VAR>

# Create role
rbac create-role --contract <ID> --role <NAME> --admin <ADMIN_ROLE> --key-env <ENV_VAR>

# Grant role
rbac grant --contract <ID> --role <NAME> --address <ADDR> [--expiry <ISO8601>] --key-env <ENV_VAR>

# Revoke role
rbac revoke --contract <ID> --role <NAME> --address <ADDR> --key-env <ENV_VAR>

# List members (uses indexer)
rbac list-members --contract <ID> --role <NAME> [--db <PATH>]

# Config lint
rbac lint --contract <ID> [--rpc <URL>] [--json]
```

## Indexer

Start the event indexer:

```bash
cd indexer
npm start -- --rpc http://127.0.0.1:8000/soroban/rpc --contract <CONTRACT_ID>
```

Query indexed data:

```bash
npm run query -- --contract <ID> --command roles
npm run query -- --contract <ID> --command members --role WITHDRAWER
npm run query -- --contract <ID> --command expiring --hours 24
```

## Security

See [SECURITY.md](SECURITY.md) for:
- Threat model documentation
- Key management best practices
- Audit recommendations

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Local development setup
- Running tests
- Contributing guidelines

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Stellar Documentation](https://developers.stellar.org)
- [Soroban Documentation](https://soroban.stellar.org)
- [SCF Pitch](SCF-PITCH.md)
