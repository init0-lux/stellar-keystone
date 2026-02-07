/**
 * Query Utilities for the RBAC Indexer
 *
 * Provides CLI commands to query the indexed data.
 *
 * @usage
 * ```bash
 * node query.js --db ./indexer.db --command roles --contract <id>
 * node query.js --db ./indexer.db --command members --contract <id> --role WITHDRAWER
 * node query.js --db ./indexer.db --command expiring --contract <id> --hours 24
 * ```
 */

import Database from 'better-sqlite3';
import { parseArgs } from 'node:util';

// =============================================================================
// Query Functions
// =============================================================================

interface QueryContext {
    db: Database.Database;
    contractId: string;
}

/**
 * List all roles for a contract
 */
function listRoles(ctx: QueryContext): void {
    const roles = ctx.db
        .prepare(
            `SELECT role, admin_role, created_at 
       FROM roles WHERE contract_id = ? 
       ORDER BY created_at DESC`
        )
        .all(ctx.contractId) as Array<{
            role: string;
            admin_role: string;
            created_at: number;
        }>;

    console.log(`\nRoles for contract ${ctx.contractId}:`);
    console.log('─'.repeat(60));

    if (roles.length === 0) {
        console.log('No roles found.');
        return;
    }

    for (const role of roles) {
        const createdAt = new Date(role.created_at * 1000).toISOString();
        console.log(`  ${role.role}`);
        console.log(`    Admin: ${role.admin_role}`);
        console.log(`    Created: ${createdAt}`);
    }

    console.log(`\nTotal: ${roles.length} roles`);
}

/**
 * List all members of a role
 */
function listMembers(ctx: QueryContext, role: string): void {
    const members = ctx.db
        .prepare(
            `SELECT account, expiry, last_updated 
       FROM role_members 
       WHERE contract_id = ? AND role = ?
       ORDER BY last_updated DESC`
        )
        .all(ctx.contractId, role) as Array<{
            account: string;
            expiry: number;
            last_updated: number;
        }>;

    console.log(`\nMembers of role "${role}":`);
    console.log('─'.repeat(60));

    if (members.length === 0) {
        console.log('No members found.');
        return;
    }

    const now = Math.floor(Date.now() / 1000);

    for (const member of members) {
        const expiryStr =
            member.expiry === 0 ? 'Never' : new Date(member.expiry * 1000).toISOString();
        const isExpired = member.expiry !== 0 && member.expiry < now;
        const status = isExpired ? '⚠️ EXPIRED' : '✅ Active';

        console.log(`  ${member.account}`);
        console.log(`    Expiry: ${expiryStr} ${status}`);
        console.log(`    Updated: ${new Date(member.last_updated * 1000).toISOString()}`);
    }

    console.log(`\nTotal: ${members.length} members`);
}

/**
 * List grants expiring within a time window
 */
function listExpiring(ctx: QueryContext, hours: number): void {
    const now = Math.floor(Date.now() / 1000);
    const maxExpiry = now + hours * 3600;

    const expiring = ctx.db
        .prepare(
            `SELECT role, account, expiry 
       FROM role_members 
       WHERE contract_id = ? 
         AND expiry > 0 
         AND expiry > ?
         AND expiry < ?
       ORDER BY expiry ASC`
        )
        .all(ctx.contractId, now, maxExpiry) as Array<{
            role: string;
            account: string;
            expiry: number;
        }>;

    console.log(`\nGrants expiring in the next ${hours} hours:`);
    console.log('─'.repeat(60));

    if (expiring.length === 0) {
        console.log('No expiring grants found.');
        return;
    }

    for (const grant of expiring) {
        const expiryDate = new Date(grant.expiry * 1000);
        const hoursLeft = ((grant.expiry - now) / 3600).toFixed(1);

        console.log(`  ${grant.account}`);
        console.log(`    Role: ${grant.role}`);
        console.log(`    Expires: ${expiryDate.toISOString()} (${hoursLeft}h remaining)`);
    }

    console.log(`\nTotal: ${expiring.length} expiring grants`);
}

/**
 * Get summary statistics
 */
function getSummary(ctx: QueryContext): void {
    const totalRoles = ctx.db
        .prepare('SELECT COUNT(*) as count FROM roles WHERE contract_id = ?')
        .get(ctx.contractId) as { count: number };

    const totalMembers = ctx.db
        .prepare('SELECT COUNT(*) as count FROM role_members WHERE contract_id = ?')
        .get(ctx.contractId) as { count: number };

    const now = Math.floor(Date.now() / 1000);
    const next24h = now + 24 * 3600;

    const expiringSoon = ctx.db
        .prepare(
            `SELECT COUNT(*) as count FROM role_members 
       WHERE contract_id = ? AND expiry > 0 AND expiry > ? AND expiry < ?`
        )
        .get(ctx.contractId, now, next24h) as { count: number };

    const expired = ctx.db
        .prepare(
            `SELECT COUNT(*) as count FROM role_members 
       WHERE contract_id = ? AND expiry > 0 AND expiry < ?`
        )
        .get(ctx.contractId, now) as { count: number };

    const totalEvents = ctx.db
        .prepare('SELECT COUNT(*) as count FROM events WHERE contract_id = ?')
        .get(ctx.contractId) as { count: number };

    console.log(`\nSummary for contract ${ctx.contractId}:`);
    console.log('─'.repeat(40));
    console.log(`  Total Roles:          ${totalRoles.count}`);
    console.log(`  Total Role Grants:    ${totalMembers.count}`);
    console.log(`  Expiring (24h):       ${expiringSoon.count}`);
    console.log(`  Expired:              ${expired.count}`);
    console.log(`  Total Events:         ${totalEvents.count}`);
}

/**
 * List recent events
 */
function listEvents(ctx: QueryContext, limit: number): void {
    const events = ctx.db
        .prepare(
            `SELECT event_type, payload, tx_hash, created_at 
       FROM events 
       WHERE contract_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
        )
        .all(ctx.contractId, limit) as Array<{
            event_type: string;
            payload: string;
            tx_hash: string;
            created_at: number;
        }>;

    console.log(`\nRecent events (last ${limit}):`);
    console.log('─'.repeat(60));

    if (events.length === 0) {
        console.log('No events found.');
        return;
    }

    for (const event of events) {
        const timestamp = new Date(event.created_at * 1000).toISOString();
        console.log(`  [${timestamp}] ${event.event_type}`);
        console.log(`    TX: ${event.tx_hash}`);
    }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
    const { values } = parseArgs({
        options: {
            db: { type: 'string', default: './indexer.db' },
            contract: { type: 'string' },
            command: { type: 'string', default: 'summary' },
            role: { type: 'string' },
            hours: { type: 'string', default: '24' },
            limit: { type: 'string', default: '10' },
            help: { type: 'boolean', short: 'h' },
        },
    });

    if (values.help) {
        console.log(`
RBAC Indexer Query Utilities

Usage:
  node query.js --db <DB_PATH> --contract <CONTRACT_ID> --command <COMMAND>

Commands:
  summary     Show summary statistics (default)
  roles       List all roles
  members     List members of a role (requires --role)
  expiring    List grants expiring soon (use --hours to specify window)
  events      List recent events (use --limit to specify count)

Options:
  --db <path>        SQLite database path (default: ./indexer.db)
  --contract <id>    Contract ID to query (required)
  --role <name>      Role name for 'members' command
  --hours <n>        Hours window for 'expiring' command (default: 24)
  --limit <n>        Number of events for 'events' command (default: 10)
  -h, --help         Show this help message
`);
        process.exit(0);
    }

    if (!values.contract) {
        console.error('Error: --contract is required');
        process.exit(1);
    }

    const db = new Database(values.db!, { readonly: true });
    const ctx: QueryContext = { db, contractId: values.contract };

    try {
        switch (values.command) {
            case 'summary':
                getSummary(ctx);
                break;
            case 'roles':
                listRoles(ctx);
                break;
            case 'members':
                if (!values.role) {
                    console.error('Error: --role is required for members command');
                    process.exit(1);
                }
                listMembers(ctx, values.role);
                break;
            case 'expiring':
                listExpiring(ctx, parseInt(values.hours!, 10));
                break;
            case 'events':
                listEvents(ctx, parseInt(values.limit!, 10));
                break;
            default:
                console.error(`Unknown command: ${values.command}`);
                process.exit(1);
        }
    } finally {
        db.close();
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
