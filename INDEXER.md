# Indexer

## What It Does (Simple Version)

The indexer is like a **historian for your RBAC contract**. It watches what happens on the blockchain and keeps a local record so you can quickly look up:

- Who has what role?
- When was a role granted or revoked?
- What's the full history of role changes?

Without the indexer, you'd have to scan the entire blockchain every time you want to know "who are all the ADMINs?" — which is slow and expensive. The indexer solves this by maintaining a local database that's always up-to-date.

---

## What It Does (Technical Version)

The indexer is an **event-driven off-chain state aggregator** that:

1. **Polls the Soroban RPC** for contract events at configurable intervals
2. **Parses RBAC events** (RoleCreated, RoleGranted, RoleRevoked, RoleAdminChanged, RoleExpired)
3. **Stores state in SQLite** for fast queries without hitting the blockchain

### Event Flow
```
Blockchain → Soroban RPC → Indexer → SQLite → Frontend/API
```

### Database Schema
| Table | Purpose |
|-------|---------|
| `contracts` | Tracks which contracts are being indexed |
| `roles` | Role definitions and their admin relationships |
| `role_members` | Current role assignments with expiry times |
| `events` | Full audit log of all role changes |
| `role_metadata` | Rich descriptions for UI display |
| `indexer_state` | Cursor tracking (last indexed ledger) |

---

## How It Fits Into the App

```
┌─────────────────────────────────────────────────────────────┐
│                      STELLAR KEYSTONE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐     ┌──────────┐     ┌───────────────────┐   │
│  │  RBAC    │────▶│ Soroban  │────▶│     INDEXER       │   │
│  │ Contract │     │   RPC    │     │  (polls events)   │   │
│  └──────────┘     └──────────┘     └─────────┬─────────┘   │
│       │                                      │              │
│       │                                      ▼              │
│       │                              ┌───────────────┐      │
│       │                              │    SQLite     │      │
│       │                              │   Database    │      │
│       │                              └───────┬───────┘      │
│       │                                      │              │
│       ▼                                      ▼              │
│  ┌──────────┐                        ┌───────────────┐      │
│  │  JS-SDK  │───────────────────────▶│   Frontend    │      │
│  │ (writes) │                        │   (reads)     │      │
│  └──────────┘                        └───────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

| Component | Role |
|-----------|------|
| **RBAC Contract** | Source of truth (on-chain) |
| **JS-SDK** | Writes to the contract (grant/revoke roles) |
| **Indexer** | Reads events and builds queryable state |
| **Frontend** | Reads from indexer DB for fast UI rendering |

### Why Not Query the Contract Directly?

| Query Type | Direct Contract | Via Indexer |
|------------|-----------------|-------------|
| "Does user X have role Y?" | ✅ Fast (single call) | ✅ Fast |
| "List all users with role Y" | ❌ Not possible | ✅ Fast |
| "Show role history" | ❌ Not possible | ✅ Fast |
| "Find expiring roles" | ❌ Not possible | ✅ Fast |

The contract only stores current state. The indexer reconstructs history and enables set queries.

---

## Usage

```bash
# Start the indexer
node indexer/dist/index.js \
  --rpc https://soroban-testnet.stellar.org \
  --db ./rbac-indexer.db \
  --contract CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Options
--rpc <url>       # Soroban RPC endpoint
--db <path>       # SQLite database file location
--contract <id>   # Contract ID to index
--interval <ms>   # Polling interval (default: 5000ms)
```

---

## Workflow Summary

1. **Indexer starts** → Connects to Soroban RPC and opens SQLite DB
2. **Polls every 5 seconds** → Fetches new events since last indexed ledger
3. **Processes events** → Updates `role_members`, `roles`, stores in `events` table
4. **Frontend queries SQLite** → Gets instant answers without blockchain calls
5. **Repeat** → Continuous loop keeps local state in sync
