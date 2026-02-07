# Stellar Keystone Indexer

Background service that indexes RBAC events into SQLite for efficient querying.

## Why?

Soroban doesn't support on-chain enumeration. You can't ask "who has role X?" without scanning all events. The indexer reconstructs current state from the event stream.

```
[ Soroban RPC ] --events--> [ Indexer ] --stores--> [ SQLite DB ]
                                                         |
[ CLI / Frontend ] <--------queries----------------------+
```

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start indexing
npm start -- --rpc http://localhost:8000/soroban/rpc --contract CXXX... --db ./indexer.db

# Or for testnet
npm start -- --rpc https://soroban-testnet.stellar.org --contract CXXX... --db ./indexer.db
```

## Database Schema

The indexer maintains 5 tables:

### `contracts`
Tracks which contracts are being indexed.

### `roles`
Role definitions with admin relationships.

### `role_members`
Current role assignments with expiry timestamps.

### `events`
Full audit trail of all RBAC events.

### `indexer_state`
Last indexed ledger per contract (for restart safety).

## Querying

Use the query utility to inspect indexed data:

```bash
# Summary statistics
npm run query -- --contract CXXX... --command summary

# List all roles
npm run query -- --contract CXXX... --command roles

# List members of a role
npm run query -- --contract CXXX... --command members --role WITHDRAWER

# Find expiring grants
npm run query -- --contract CXXX... --command expiring --hours 24

# Recent events
npm run query -- --contract CXXX... --command events --limit 10
```

## Operational Notes

- Designed for local and testnet usage
- Persists last indexed ledger for restart safety
- Retry logic: 3 attempts with exponential backoff for transient failures
- Can be extended for production use with structured logging and metrics

## API Integration

The frontend uses API routes to query the indexer database:

```typescript
// Example: frontend/app/api/indexer/roles/route.ts
import Database from 'better-sqlite3';

export async function GET() {
  const db = new Database('./indexer.db', { readonly: true });
  const roles = db.prepare('SELECT * FROM roles').all();
  return Response.json(roles);
}
```

See `frontend/app/api/indexer/` for complete examples.

## Event Types

The indexer processes 5 event types:

1. **RoleCreated** → Insert into `roles` table
2. **RoleGranted** → Upsert into `role_members` table
3. **RoleRevoked** → Delete from `role_members` table
4. **RoleAdminChanged** → Update `roles.admin_role`
5. **RoleExpired** → Delete from `role_members` table

## Configuration

```bash
# Options
--rpc <url>        # Soroban RPC URL (default: http://127.0.0.1:8000/soroban/rpc)
--db <path>        # SQLite database path (default: ./indexer.db)
--contract <id>    # Contract ID to index (can add more via DB)
--interval <ms>    # Polling interval (default: 5000)
```

## Troubleshooting

**Indexer stops processing events**
- Check RPC endpoint is reachable
- Verify contract ID is correct
- Check logs for retry attempts

**Missing events**
- Indexer saves last processed ledger to DB
- Restart will resume from last checkpoint
- For full backfill, delete `indexer_state` table entry

**Database locked errors**
- Ensure only one indexer instance per database
- Use `readonly: true` for query connections

## See Also

- [CLI](../cli/README.md) - Uses indexer for `list-members` and `lint` commands
- [Frontend](../frontend/README.md) - Queries indexer via API routes

## License

MIT
