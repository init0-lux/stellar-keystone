/**
 * Stellar Keystone RBAC Indexer
 *
 * A minimal event indexer that polls Soroban RPC for RBAC contract events
 * and stores them in a SQLite database for efficient querying.
 *
 * @usage
 * ```bash
 * node indexer/dist/index.js --rpc http://127.0.0.1:8000 --db ./indexer.db --contract <id>
 * ```
 */

import Database from 'better-sqlite3';
import { SorobanRpc, scValToNative } from '@stellar/stellar-sdk';
import { parseArgs } from 'node:util';

// =============================================================================
// Types
// =============================================================================

interface IndexerConfig {
    rpcUrl: string;
    dbPath: string;
    contractId?: string;
    pollInterval: number;
}

interface ParsedEvent {
    contractId: string;
    eventType: string;
    role: string;
    account?: string;
    expiry?: number;
    adminRole?: string;
    previousAdmin?: string;
    newAdmin?: string;
    txHash: string;
    ledgerTimestamp: number;
}

// =============================================================================
// Database Schema
// =============================================================================

const SCHEMA = `
-- Contracts tracked by the indexer
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  deployed_at INTEGER
);

-- Roles and their admin relationships
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT NOT NULL,
  role TEXT NOT NULL,
  admin_role TEXT,
  created_at INTEGER,
  UNIQUE(contract_id, role)
);

-- Role membership with expiry
CREATE TABLE IF NOT EXISTS role_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT NOT NULL,
  role TEXT NOT NULL,
  account TEXT NOT NULL,
  expiry INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER,
  UNIQUE(contract_id, role, account)
);

-- All events for audit trail
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  tx_hash TEXT,
  created_at INTEGER
);

-- Indexing metadata
CREATE TABLE IF NOT EXISTS indexer_state (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_role_members_contract_role 
  ON role_members(contract_id, role);
CREATE INDEX IF NOT EXISTS idx_role_members_expiry 
  ON role_members(expiry) WHERE expiry > 0;
CREATE INDEX IF NOT EXISTS idx_events_contract 
  ON events(contract_id);
CREATE INDEX IF NOT EXISTS idx_events_type 
  ON events(event_type);

-- Role metadata for rich display
CREATE TABLE IF NOT EXISTS role_metadata (
  role TEXT PRIMARY KEY,
  description TEXT,
  permissions TEXT, -- JSON array
  updated_at INTEGER
);
`;

// =============================================================================
// Indexer Class
// =============================================================================

class RbacIndexer {
    private db: Database.Database;
    private server: SorobanRpc.Server;
    private config: IndexerConfig;
    private running: boolean = false;

    constructor(config: IndexerConfig) {
        this.config = config;
        this.db = new Database(config.dbPath);
        this.server = new SorobanRpc.Server(config.rpcUrl);

        // Initialize schema
        this.initSchema();
    }

    private initSchema(): void {
        this.db.exec(SCHEMA);
        console.log('[Indexer] Database schema initialized');
    }

    /**
     * Register a contract for indexing
     */
    registerContract(contractId: string): void {
        const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO contracts (id, deployed_at)
      VALUES (?, ?)
    `);
        stmt.run(contractId, Math.floor(Date.now() / 1000));
        console.log(`[Indexer] Registered contract: ${contractId}`);
    }

    /**
     * Get the last indexed ledger sequence for a contract
     */
    private getLastIndexedLedger(contractId: string): number | undefined {
        const result = this.db
            .prepare('SELECT value FROM indexer_state WHERE key = ?')
            .get(`last_ledger_${contractId}`) as { value: string } | undefined;
        return result ? parseInt(result.value, 10) : undefined;
    }

    /**
     * Update the last indexed ledger sequence
     */
    private setLastIndexedLedger(contractId: string, ledger: number): void {
        this.db
            .prepare('INSERT OR REPLACE INTO indexer_state (key, value) VALUES (?, ?)')
            .run(`last_ledger_${contractId}`, ledger.toString());
    }

    /**
     * Start the indexer polling loop
     */
    async start(): Promise<void> {
        this.running = true;
        console.log(`[Indexer] Starting polling every ${this.config.pollInterval}ms...`);

        while (this.running) {
            await this.poll();
            await this.sleep(this.config.pollInterval);
        }
    }

    /**
     * Stop the indexer
     */
    stop(): void {
        this.running = false;
        console.log('[Indexer] Stopping...');
    }

    /**
     * Poll for new events from all registered contracts
     */
    private async poll(): Promise<void> {
        const contracts = this.db
            .prepare('SELECT id FROM contracts')
            .all() as Array<{ id: string }>;

        for (const contract of contracts) {
            await this.pollWithRetry(contract.id);
        }
    }

    /**
     * Poll a contract with retry logic
     */
    private async pollWithRetry(
        contractId: string,
        maxRetries: number = 3
    ): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.pollContract(contractId);
                return; // Success
            } catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const errorMsg = error instanceof Error ? error.message : String(error);

                if (isLastAttempt) {
                    console.error(
                        `[Indexer] Failed to poll ${contractId} after ${maxRetries} attempts: ${errorMsg}`
                    );
                } else {
                    const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                    console.warn(
                        `[Indexer] Attempt ${attempt}/${maxRetries} failed for ${contractId}, ` +
                        `retrying in ${backoffMs}ms...`
                    );
                    await this.sleep(backoffMs);
                }
            }
        }
    }

    /**
     * Poll events for a specific contract
     */
    private async pollContract(contractId: string): Promise<void> {
        const lastLedger = this.getLastIndexedLedger(contractId);

        try {
            const response = await this.server.getEvents({
                startLedger: lastLedger ? lastLedger + 1 : 1,
                filters: [
                    {
                        type: 'contract',
                        contractIds: [contractId],
                    },
                ],
                limit: 1000,
            });

            if (response.events && response.events.length > 0) {
                console.log(`[Indexer] Found ${response.events.length} events for ${contractId}`);

                for (const event of response.events) {
                    this.processEvent(contractId, event);
                }
            }

            // Update last indexed ledger
            if (response.latestLedger) {
                this.setLastIndexedLedger(contractId, response.latestLedger);
            }
        } catch (error) {
            // Handle case where no events exist yet
            const err = error as Error;
            if (!err.message?.includes('not found')) {
                throw error;
            }
        }
    }

    /**
     * Process a single event and update the database
     */
    private processEvent(contractId: string, event: SorobanRpc.Api.EventResponse): void {
        try {
            const parsed = this.parseEvent(contractId, event);
            if (!parsed) return;

            // Store raw event
            this.storeEvent(parsed);

            // Update state based on event type
            switch (parsed.eventType) {
                case 'RoleCreated':
                    this.handleRoleCreated(parsed);
                    break;
                case 'RoleGranted':
                    this.handleRoleGranted(parsed);
                    break;
                case 'RoleRevoked':
                    this.handleRoleRevoked(parsed);
                    break;
                case 'RoleAdminChanged':
                    this.handleRoleAdminChanged(parsed);
                    break;
                case 'RoleExpired':
                    this.handleRoleExpired(parsed);
                    break;
            }
        } catch (error) {
            console.error('[Indexer] Error processing event:', error);
        }
    }

    /**
     * Parse a raw Soroban event into a structured format
     */
    private parseEvent(
        contractId: string,
        event: SorobanRpc.Api.EventResponse
    ): ParsedEvent | null {
        try {
            const topics = event.topic.map((t) => scValToNative(t));

            // Map short event names to full names
            const typeMap: Record<string, string> = {
                RoleCreat: 'RoleCreated',
                RoleGrant: 'RoleGranted',
                RoleRevok: 'RoleRevoked',
                AdminChg: 'RoleAdminChanged',
                RoleExpir: 'RoleExpired',
            };

            const eventType = typeMap[String(topics[0])] || String(topics[0]);

            const parsed: ParsedEvent = {
                contractId,
                eventType,
                role: String(topics[1] || ''),
                txHash: event.id,
                ledgerTimestamp: event.ledgerClosedAt
                    ? parseInt(event.ledgerClosedAt, 10)
                    : Math.floor(Date.now() / 1000),
            };

            // Extract account from topics if present
            if (topics[2]) {
                parsed.account = String(topics[2]);
            }

            // Parse value based on event type
            const value = scValToNative(event.value);

            switch (eventType) {
                case 'RoleCreated':
                    parsed.adminRole = String(value);
                    break;
                case 'RoleGranted':
                    if (Array.isArray(value)) {
                        parsed.expiry = value[0] as number;
                    }
                    break;
                case 'RoleAdminChanged':
                    if (Array.isArray(value)) {
                        parsed.previousAdmin = String(value[0]);
                        parsed.newAdmin = String(value[1]);
                    }
                    break;
                case 'RoleExpired':
                    parsed.expiry = Number(value);
                    break;
            }

            return parsed;
        } catch (error) {
            console.error('[Indexer] Error parsing event:', error);
            return null;
        }
    }

    /**
     * Store an event in the events table
     */
    private storeEvent(event: ParsedEvent): void {
        this.db
            .prepare(
                `INSERT INTO events (contract_id, event_type, payload, tx_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`
            )
            .run(
                event.contractId,
                event.eventType,
                JSON.stringify(event),
                event.txHash,
                event.ledgerTimestamp
            );
    }

    /**
     * Handle RoleCreated event
     */
    private handleRoleCreated(event: ParsedEvent): void {
        this.db
            .prepare(
                `INSERT OR REPLACE INTO roles (contract_id, role, admin_role, created_at)
         VALUES (?, ?, ?, ?)`
            )
            .run(event.contractId, event.role, event.adminRole, event.ledgerTimestamp);

        console.log(`[Indexer] Role created: ${event.role} (admin: ${event.adminRole})`);
    }

    /**
     * Handle RoleGranted event
     */
    private handleRoleGranted(event: ParsedEvent): void {
        this.db
            .prepare(
                `INSERT OR REPLACE INTO role_members (contract_id, role, account, expiry, last_updated)
         VALUES (?, ?, ?, ?, ?)`
            )
            .run(
                event.contractId,
                event.role,
                event.account,
                event.expiry ?? 0,
                event.ledgerTimestamp
            );

        console.log(`[Indexer] Role granted: ${event.role} to ${event.account}`);
    }

    /**
     * Handle RoleRevoked event
     */
    private handleRoleRevoked(event: ParsedEvent): void {
        this.db
            .prepare(
                `DELETE FROM role_members 
         WHERE contract_id = ? AND role = ? AND account = ?`
            )
            .run(event.contractId, event.role, event.account);

        console.log(`[Indexer] Role revoked: ${event.role} from ${event.account}`);
    }

    /**
     * Handle RoleAdminChanged event
     */
    private handleRoleAdminChanged(event: ParsedEvent): void {
        this.db
            .prepare(
                `UPDATE roles SET admin_role = ? WHERE contract_id = ? AND role = ?`
            )
            .run(event.newAdmin, event.contractId, event.role);

        console.log(
            `[Indexer] Role admin changed: ${event.role} from ${event.previousAdmin} to ${event.newAdmin}`
        );
    }

    /**
     * Handle RoleExpired event
     */
    private handleRoleExpired(event: ParsedEvent): void {
        // Optionally mark as expired rather than delete
        this.db
            .prepare(
                `DELETE FROM role_members 
         WHERE contract_id = ? AND role = ? AND account = ?`
            )
            .run(event.contractId, event.role, event.account);

        console.log(`[Indexer] Role expired: ${event.role} for ${event.account}`);
    }

    /**
     * Utility sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Close the database connection
     */
    close(): void {
        this.db.close();
    }
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
    const { values } = parseArgs({
        options: {
            rpc: { type: 'string', default: 'http://127.0.0.1:8000/soroban/rpc' },
            db: { type: 'string', default: './indexer.db' },
            contract: { type: 'string' },
            interval: { type: 'string', default: '5000' },
            help: { type: 'boolean', short: 'h' },
        },
    });

    if (values.help) {
        console.log(`
Stellar Keystone RBAC Indexer

Usage:
  node index.js --rpc <RPC_URL> --db <DB_PATH> --contract <CONTRACT_ID>

Options:
  --rpc <url>        Soroban RPC URL (default: http://127.0.0.1:8000/soroban/rpc)
  --db <path>        SQLite database path (default: ./indexer.db)
  --contract <id>    Contract ID to index (can be added later)
  --interval <ms>    Polling interval in milliseconds (default: 5000)
  -h, --help         Show this help message
`);
        process.exit(0);
    }

    const config: IndexerConfig = {
        rpcUrl: values.rpc!,
        dbPath: values.db!,
        contractId: values.contract,
        pollInterval: parseInt(values.interval!, 10),
    };

    console.log('========================================');
    console.log('Stellar Keystone RBAC Indexer');
    console.log('========================================');
    console.log(`RPC URL: ${config.rpcUrl}`);
    console.log(`Database: ${config.dbPath}`);
    console.log(`Poll Interval: ${config.pollInterval}ms`);
    console.log('========================================\n');

    const indexer = new RbacIndexer(config);

    // Register contract if provided
    if (config.contractId) {
        indexer.registerContract(config.contractId);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[Indexer] Shutting down...');
        indexer.stop();
        indexer.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        indexer.stop();
        indexer.close();
        process.exit(0);
    });

    // Start indexing
    await indexer.start();
}

// Export for testing
export { RbacIndexer, IndexerConfig, ParsedEvent };

// Run if invoked directly
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
