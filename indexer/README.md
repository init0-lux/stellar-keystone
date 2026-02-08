# Stellar Keystone Indexer

Background service that indexes RBAC events into SQLite for efficient querying.

## Why?

Soroban doesn't support on-chain enumeration. The indexer reconstructs current state from events.

```
[ Soroban RPC ] → [ Indexer ] → [ SQLite ] → [ CLI/Frontend ]
```

## Quick Start

```bash
npm install && npm run build

# Start indexing
npm start -- --rpc https://soroban-testnet.stellar.org --contract CXXX... --db ./indexer.db
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `contracts` | Tracked contracts |
| `roles` | Role definitions with admins |
| `role_members` | Current assignments + expiry |
| `events` | Full audit trail |
| `indexer_state` | Last indexed ledger (restart safety) |

## Querying

```bash
npm run query -- --contract CXXX... --command summary
npm run query -- --contract CXXX... --command members --role WITHDRAWER
npm run query -- --contract CXXX... --command expiring --hours 24
```

## Event Processing

1. **RoleCreated** → Insert into `roles`
2. **RoleGranted** → Upsert into `role_members`
3. **RoleRevoked** → Delete from `role_members`
4. **RoleAdminChanged** → Update `roles.admin_role`
5. **RoleExpired** → Delete from `role_members`

## Operational Notes

- Designed for local and testnet usage
- Retry logic: 3 attempts with exponential backoff
- Persists last indexed ledger for restart safety
- Can be extended for production with structured logging

## API Integration

Frontend queries via API routes:

```typescript
// Example: frontend/app/api/indexer/roles/route.ts
const db = new Database('./indexer.db', { readonly: true });
const roles = db.prepare('SELECT * FROM roles WHERE contract_id = ?').all(contractId);
```

See `frontend/app/api/indexer/` for examples.

## Configuration

```bash
--rpc <url>        # Soroban RPC URL
--db <path>        # SQLite database path
--contract <id>    # Contract ID to index
--interval <ms>    # Polling interval (default: 5000)
```

## Troubleshooting

- **Stops processing** → Check RPC endpoint, verify contract ID
- **Missing events** → Indexer resumes from last checkpoint on restart
- **Database locked** → Ensure only one indexer instance per database

## See Also

[CLI](../cli/README.md) | [Frontend](../frontend/README.md)
