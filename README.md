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

## Problem Statement

Managing permissions in decentralized applications is complex. Hardcoding addresses (e.g., `const ADMIN = 'G...'`) into smart contracts is rigid, hard to audit, and difficult to update. Key rotation becomes a nightmare, and visibility into "who can do what" is often non-existent.

**Stellar Keystone solves this by:**
1.  **Decoupling Permissions**: Storing roles and grants in a dedicated, on-chain contract.
2.  **Providing Visibility**: Indexing events to show specific role members and expiry times.
3.  **Enabling Flexibility**: Allowing admins to expire, revoke, or re-assign roles without upgrading the core business logic contracts.

## Screenshots

![Dashboard Preview](assets/dashboard-preview.webp)

*Admin Dashboard showing active roles and recent activity.*

## Deployed Link & Contract

- **Admin Dashboard**: [Replace with Vercel/Netlify Link]
- **Testnet Contract Address**: `[Replace with your deployed Contract ID]`


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
cd rbac && \
  cargo build \
    --release \
    --target wasm32-unknown-unknown

# Install SDK dependencies
cd ../js-sdk && npm install

# Install CLI
cd ../cli && npm install && npm link

# Install indexer
cd ../indexer && npm install

# Start the frontend
cd ../frontend && npm install && npm run dev
```

### Deploy Your First Contract

**1. Get a Signer Key**

For testnet, create a new identity with Stellar CLI:

```bash
# Generate a new keypair
stellar keys generate demo --network testnet

# Fund it with testnet XLM (required for deployment)
stellar keys fund demo --network testnet

# Get your secret key (starts with S)
stellar keys show demo
# Copy the Secret key: SXXX...
```

**2. Set Environment Variable**

```bash
# Set your signer key
export SIGNER_KEY=SXXX...
```

**3. Deploy the Contract**

```bash
# Deploy to testnet (automatically loads WASM from rbac/target/)
rbac deploy \
  --network testnet \
  --key-env SIGNER_KEY

# Save the Contract ID from output:
# ✅ Deployment successful!
#    Contract ID: CXXX...
#    TX Hash: abc123...

# Save it for convenience
export CONTRACT_ID=CXXX...
```

**4. Verify Initialization**

The deployment should automatically initialize the contract, but verify it worked:

```bash
# Check if contract is initialized (should return your address)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_deployer

# If it returns null, initialize manually:
stellar contract invoke \
  --id $CONTRACT_ID \
  --source keystone-admin \
  --network testnet \
  -- initialize \
  --admin $(stellar keys address keystone-admin)
```

**5. Create and Grant Roles**

```bash
# Save contract ID for convenience
export CONTRACT_ID=CXXX...

# Create a role
rbac create-role \
  --contract $CONTRACT_ID \
  --role WITHDRAWER \
  --admin DEF_ADMIN \
  --key-env SIGNER_KEY

# Grant the role to an address
rbac grant \
  --contract $CONTRACT_ID \
  --role WITHDRAWER \
  --address GXXX... \
  --key-env SIGNER_KEY

# Grant with expiry (30 days from now)
rbac grant \
  --contract $CONTRACT_ID \
  --role WITHDRAWER \
  --address GYYY... \
  --expiry "2026-03-10T00:00:00Z" \
  --key-env SIGNER_KEY

# Verify the grant
rbac has-role \
  --contract $CONTRACT_ID \
  --role WITHDRAWER \
  --address GXXX... \
  --json

# List all members of a role (requires indexer)
rbac list-members \
  --contract $CONTRACT_ID \
  --role WITHDRAWER

# Revoke a role
rbac revoke \
  --contract $CONTRACT_ID \
  --role WITHDRAWER \
  --address GXXX... \
  --key-env SIGNER_KEY

# Run configuration lint checks
rbac lint \
  --contract $CONTRACT_ID \
  --network testnet \
  --json
```

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Layer                           │
│  Frontend (Next.js) | CLI (Node.js) | Custom App        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   JS SDK         │
            └────────┬─────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Soroban RPC   Indexer      Events
        │        (SQLite)        │
        │            │           │
        └────────────┴───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Stellar Blockchain (Soroban)                    │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  RBAC Contract   │◀─────│  Your Contract   │         │
│  └──────────────────┘      └──────────────────┘         │
│         │ emits events                                  │
│         ▼                                               │
│  [ RoleCreated, RoleGranted, RoleRevoked, ... ]         │
└─────────────────────────────────────────────────────────┘
```

### Component Structure

```
stellar-keystone/
├── rbac/                   # Soroban RBAC contract (Rust)
├── js-sdk/                 # TypeScript SDK for interactions
├── cli/                    # CLI tools for admin tasks
├── indexer/                # Event indexer (SQLite + RPC polling)
└── frontend/               # Next.js Admin Dashboard
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

# Install dependencies (if not done already)
npm install

# Build
npm run build

# Start indexing
npm start -- \
  --rpc https://soroban-testnet.stellar.org \
  --contract $CONTRACT_ID
```

Query indexed data:

```bash
npm run query -- --contract $CONTRACT_ID --command roles
npm run query -- --contract $CONTRACT_ID --command members --role WITHDRAWER
npm run query -- --contract $CONTRACT_ID --command expiring --hours 24
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

## Future Scope

1.  **Multi-chain Support**: Adapting the SDK for other WASM-based chains.
2.  **DAO Integration**: Allowing roles to be managed by a DAO (multisig or governance token) instead of a single admin key.
3.  **Audit & Verification**: Formal verification of the RBAC contract logic.
4.  **Mainnet Launch**: Deployment to Stellar Mainnet with robust indexer infrastructure.

## Links

- [Stellar Documentation](https://developers.stellar.org)
- [Soroban Documentation](https://soroban.stellar.org)
- [SCF Pitch](SCF-PITCH.md)
