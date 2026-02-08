# Stellar Keystone Admin UI

Next.js 15 admin panel for managing RBAC contracts.

## Tech Stack

Next.js 15 + React 19 • TypeScript • Tailwind CSS • Radix UI • Tanstack Query

## Quick Start

```bash
npm install
cp .env.example .env.local  # Edit with your values
npm run dev  # http://localhost:3000
```

## Environment Variables

```bash
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_INDEXER_API_URL=/api/indexer
NEXT_PUBLIC_NETWORK=testnet
```

## Features

- **Contract Management:** Deploy and initialize RBAC contracts
- **Role Management:** Create roles, view hierarchy, change admins
- **Member Management:** Grant/revoke roles with expiry tracking
- **Monitoring:** Expiry dashboard, audit logs, role visualization

## API Routes

```typescript
// GET /api/indexer/roles - List all roles
// GET /api/indexer/members/[role] - List role members with expiry
// POST /api/deploy - Deploy contract (server-side)

// Example integration:
import Database from 'better-sqlite3';
const db = new Database(process.env.INDEXER_DB_PATH!, { readonly: true });
const roles = db.prepare('SELECT * FROM roles WHERE contract_id = ?').all(contractId);
```

See `app/api/indexer/` for complete examples.

## Project Structure

```
frontend/
├── app/
│   ├── api/           # API routes (indexer queries)
│   ├── dashboard/     # Main dashboard
│   ├── roles/         # Role management
│   └── deploy/        # Contract deployment
├── components/ui/     # Radix UI components
└── lib/               # Utilities and API client
```

## Production Build

```bash
npm run build
npm start
# or deploy to Vercel
```

## Troubleshooting

- **API 500 errors** → Verify indexer running, check `INDEXER_DB_PATH`
- **Deployment fails** → Verify RPC URL, check signer has testnet funds
- **Roles not appearing** → Ensure indexer processed events, verify contract ID

## See Also

[Indexer](../indexer/README.md) | [SDK](../js-sdk/README.md) | [CLI](../cli/README.md)
