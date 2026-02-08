# Stellar Keystone Architecture

High-level overview of system components and data flow.

## System Diagram

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
│  [ RoleCreated, RoleGranted, RoleRevoked, ... ]        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Role Grant Flow
```
User → SDK → Soroban RPC → RBAC Contract
                                 ├─ Update storage
                                 └─ Emit RoleGranted event
                                          │
                                          ▼
                                    Indexer polls → SQLite → Frontend
```

### Role Check Flow
```
Your Contract → RBAC.has_role() → Check storage + expiry → Return bool
```

## Component Responsibilities

| Component | Role | Trust Level |
|-----------|------|-------------|
| **RBAC Contract** | Single source of truth, enforces authorization | ✅ TRUSTED (on-chain) |
| **JS SDK** | Simplifies contract interaction, builds transactions | ⚠️ UNTRUSTED (convenience) |
| **CLI** | Command-line interface for operations | ⚠️ UNTRUSTED (convenience) |
| **Indexer** | Reconstructs state from events (read-only) | ⚠️ UNTRUSTED (can rebuild) |
| **Frontend** | Visual interface, queries indexer | ⚠️ UNTRUSTED (convenience) |

**Key Principle:** Only the on-chain contract enforces authorization. Everything else is for UX.

## Storage Layout

### RBAC Contract
```
Storage Key          │  Value
─────────────────────┼──────────
Initialized          │  bool
Deployer             │  Address
Role(symbol)         │  AdminRole
Member(role, addr)   │  Expiry (u64)
```

### Indexer Database
```
contracts      → id, deployed_at
roles          → contract_id, role, admin_role, created_at
role_members   → contract_id, role, account, expiry, last_updated
events         → contract_id, event_type, payload, tx_hash, created_at
indexer_state  → key, value (last indexed ledger)
```

## Integration Patterns

### Pattern 1: Authorization Check
```rust
// In your contract
let rbac = RbacClient::new(&env, &rbac_contract_id);
if !rbac.has_role(&WITHDRAWER_ROLE, &account) {
    panic!("Not authorized");
}
```

### Pattern 2: Event-Driven UI
```typescript
// Frontend polls indexer
const members = await fetch('/api/indexer/members?role=ADMIN');
```

### Pattern 3: CI/CD Automation
```bash
CONTRACT_ID=$(rbac deploy --network testnet | grep "Contract ID" | awk '{print $3}')
rbac grant --contract $CONTRACT_ID --role OPERATOR --address $BOT_ADDRESS
```

## Deployment Topology

- **Development:** Local Soroban → Indexer (SQLite) → Frontend (localhost)
- **Testnet:** Stellar Testnet → Indexer (VPS) → Frontend (Vercel)
- **Production:** Stellar Mainnet → Indexer (Multi-region) → Frontend (CDN) + Metrics

## Performance

- Contract calls: ~0.1-0.5s on testnet
- Indexer polling: 5s default interval
- Database queries: <10ms
- Event backfill: ~1000 events/second

## See Also

[RBAC Contract](./rbac/README.md) | [SDK](./js-sdk/README.md) | [Indexer](./indexer/README.md) | [SECURITY.md](./SECURITY.md)
