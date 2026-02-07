# Stellar Keystone Admin UI

Next.js 15 admin panel for managing RBAC contracts on Soroban.

## Tech Stack

- **Framework:** Next.js 15 + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** Radix UI
- **Data Fetching:** Tanstack Query
- **Forms:** React Hook Form

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_INDEXER_API_URL=/api/indexer
NEXT_PUBLIC_NETWORK=testnet
```

## Features

### Contract Management
- Deploy new RBAC contracts
- View deployed contracts
- Initialize with admin account

### Role Management
- Create roles with admin hierarchy
- View all roles and their admins
- Change role admins

### Member Management
- Grant roles to accounts
- Set expiry timestamps
- Revoke roles
- View role members with expiry status

### Monitoring
- Expiry tracking dashboard
- Role hierarchy visualization
- Audit log viewer

## API Routes

The frontend provides API routes that query the indexer database:

### `GET /api/indexer/roles`
List all roles for a contract.

### `GET /api/indexer/members/[role]`
List all members of a specific role with expiry information.

### `POST /api/deploy`
Deploy a new RBAC contract (server-side SDK call).

Example integration:

```typescript
// app/api/indexer/roles/route.ts
import Database from 'better-sqlite3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get('contract');
  
  const db = new Database(process.env.INDEXER_DB_PATH!, { readonly: true });
  const roles = db.prepare('SELECT * FROM roles WHERE contract_id = ?').all(contractId);
  
  return Response.json(roles);
}
```

## Project Structure

```
frontend/
├── app/
│   ├── api/           # API routes (indexer queries)
│   ├── dashboard/     # Main dashboard
│   ├── roles/         # Role management
│   └── deploy/        # Contract deployment
├── components/
│   ├── ui/            # Radix UI components
│   └── ...            # Custom components
└── lib/
    ├── utils.ts       # Utilities
    └── api.ts         # API client
```

## Development

```bash
# Run dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel deploy
```

## Troubleshooting

**API routes return 500 errors**
- Verify indexer is running
- Check `INDEXER_DB_PATH` points to correct database
- Ensure database has been populated by indexer

**Contract deployment fails**
- Verify `NEXT_PUBLIC_RPC_URL` is correct
- Check signer key has testnet funds
- Review browser console for detailed errors

**Roles not appearing**
- Ensure indexer has processed events
- Check contract ID is correct
- Verify API route is querying correct database

## See Also

- [Indexer](../indexer/README.md) - Event indexing setup
- [SDK](../js-sdk/README.md) - JavaScript SDK documentation
- [CLI](../cli/README.md) - Command-line alternative

## License

MIT
