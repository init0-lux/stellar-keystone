#!/usr/bin/env node

/**
 * Stellar Keystone RBAC CLI
 *
 * Command-line interface for managing RBAC contracts on Stellar/Soroban.
 *
 * @usage
 * ```bash
 * # Deploy RBAC contract
 * rbac deploy --network testnet --key-env SIGNER_KEY
 *
 * # Create a role
 * rbac create-role --contract <id> --role WITHDRAWER --admin DEF_ADMIN --key-env SIGNER_KEY
 *
 * # Grant a role
 * rbac grant --contract <id> --role WITHDRAWER --address <addr> --key-env SIGNER_KEY
 *
 * # Revoke a role
 * rbac revoke --contract <id> --role WITHDRAWER --address <addr> --key-env SIGNER_KEY
 *
 * # List members (requires indexer)
 * rbac list-members --contract <id> --role WITHDRAWER
 *
 * # Run config lint
 * rbac lint --contract <id> --rpc <rpc_url>
 * ```
 */

import { Command } from 'commander';
import {
    deployRbac,
    createRole,
    grantRole,
    revokeRole,
    hasRole,
    isoToUnixTimestamp,
    NetworkType,
} from '@stellar-keystone/sdk';

// =============================================================================
// Types
// =============================================================================

interface LintResult {
    check: string;
    severity: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    details?: Record<string, unknown>;
}

interface LintReport {
    contractId: string;
    timestamp: string;
    checks: LintResult[];
    summary: {
        total: number;
        info: number;
        warnings: number;
        errors: number;
    };
}

// =============================================================================
// CLI Setup
// =============================================================================

const program = new Command();

program
    .name('rbac')
    .description('Stellar Keystone RBAC CLI - Manage role-based access control on Soroban')
    .version('1.0.0');

// =============================================================================
// Deploy Command
// =============================================================================

program
    .command('deploy')
    .description('Deploy a new RBAC contract')
    .requiredOption('--network <network>', 'Network to deploy to (local or testnet)', 'testnet')
    .requiredOption('--key-env <envVar>', 'Environment variable name containing the signer secret key')
    .action(async (options) => {
        try {
            const signerKey = process.env[options.keyEnv];
            if (!signerKey) {
                console.error(`Error: Environment variable ${options.keyEnv} is not set`);
                process.exit(1);
            }

            console.log(`\nDeploying RBAC contract to ${options.network}...`);
            const network = options.network as NetworkType;

            const result = await deployRbac(network, signerKey);

            console.log('\n✅ Deployment successful!');
            console.log(`   Contract ID: ${result.contractId}`);
            console.log(`   TX Hash: ${result.txHash}`);
            console.log(`\nSave this contract ID for future commands.`);
        } catch (error) {
            console.error('Deployment failed:', error);
            process.exit(1);
        }
    });

// =============================================================================
// Create Role Command
// =============================================================================

program
    .command('create-role')
    .description('Create a new role in the RBAC contract')
    .requiredOption('--contract <contractId>', 'RBAC contract ID')
    .requiredOption('--role <roleName>', 'Name of the role to create')
    .requiredOption('--admin <adminRole>', 'Admin role that manages this role')
    .requiredOption('--key-env <envVar>', 'Environment variable name containing the signer secret key')
    .option('--network <network>', 'Network to use (local or testnet)', 'testnet')
    .action(async (options) => {
        try {
            const signerKey = process.env[options.keyEnv];
            if (!signerKey) {
                console.error(`Error: Environment variable ${options.keyEnv} is not set`);
                process.exit(1);
            }

            console.log(`\nCreating role "${options.role}" with admin "${options.admin}"...`);
            const network = options.network as NetworkType;

            const txHash = await createRole(
                options.contract,
                options.role,
                options.admin,
                signerKey,
                network
            );

            console.log('\n✅ Role created successfully!');
            console.log(`   Role: ${options.role}`);
            console.log(`   Admin: ${options.admin}`);
            console.log(`   TX Hash: ${txHash}`);
        } catch (error) {
            console.error('Failed to create role:', error);
            process.exit(1);
        }
    });

// =============================================================================
// Grant Role Command
// =============================================================================

program
    .command('grant')
    .description('Grant a role to an account')
    .requiredOption('--contract <contractId>', 'RBAC contract ID')
    .requiredOption('--role <roleName>', 'Name of the role to grant')
    .requiredOption('--address <address>', 'Address to grant the role to')
    .option('--expiry <iso8601>', 'Expiry date in ISO8601 format (e.g., 2025-12-31T23:59:59Z)')
    .option('--expiry-ts <timestamp>', 'Expiry as Unix timestamp (seconds)')
    .requiredOption('--key-env <envVar>', 'Environment variable name containing the signer secret key')
    .option('--network <network>', 'Network to use (local or testnet)', 'testnet')
    .action(async (options) => {
        try {
            const signerKey = process.env[options.keyEnv];
            if (!signerKey) {
                console.error(`Error: Environment variable ${options.keyEnv} is not set`);
                process.exit(1);
            }

            // Determine expiry
            let expiryIso: string | undefined;
            if (options.expiryTs) {
                // Convert Unix timestamp to ISO
                const ts = parseInt(options.expiryTs, 10);
                expiryIso = new Date(ts * 1000).toISOString();
            } else if (options.expiry) {
                expiryIso = options.expiry;
            }

            console.log(`\nGranting role "${options.role}" to ${options.address}...`);
            if (expiryIso) {
                console.log(`   Expires: ${expiryIso}`);
            } else {
                console.log(`   Expires: Never`);
            }

            const network = options.network as NetworkType;

            const txHash = await grantRole(
                options.contract,
                options.role,
                options.address,
                expiryIso,
                signerKey,
                network
            );

            console.log('\n✅ Role granted successfully!');
            console.log(`   TX Hash: ${txHash}`);
        } catch (error) {
            console.error('Failed to grant role:', error);
            process.exit(1);
        }
    });

// =============================================================================
// Revoke Role Command
// =============================================================================

program
    .command('revoke')
    .description('Revoke a role from an account')
    .requiredOption('--contract <contractId>', 'RBAC contract ID')
    .requiredOption('--role <roleName>', 'Name of the role to revoke')
    .requiredOption('--address <address>', 'Address to revoke the role from')
    .requiredOption('--key-env <envVar>', 'Environment variable name containing the signer secret key')
    .option('--network <network>', 'Network to use (local or testnet)', 'testnet')
    .action(async (options) => {
        try {
            const signerKey = process.env[options.keyEnv];
            if (!signerKey) {
                console.error(`Error: Environment variable ${options.keyEnv} is not set`);
                process.exit(1);
            }

            console.log(`\nRevoking role "${options.role}" from ${options.address}...`);
            const network = options.network as NetworkType;

            const txHash = await revokeRole(
                options.contract,
                options.role,
                options.address,
                signerKey,
                network
            );

            console.log('\n✅ Role revoked successfully!');
            console.log(`   TX Hash: ${txHash}`);
        } catch (error) {
            console.error('Failed to revoke role:', error);
            process.exit(1);
        }
    });

// =============================================================================
// List Members Command
// =============================================================================

program
    .command('list-members')
    .description('List all members of a role (requires indexer)')
    .requiredOption('--contract <contractId>', 'RBAC contract ID')
    .requiredOption('--role <roleName>', 'Name of the role')
    .option('--db <path>', 'Path to indexer database', './indexer/indexer.db')
    .action(async (options) => {
        try {
            console.log(`\nListing members of role "${options.role}"...`);
            console.log(`   Contract: ${options.contract}`);
            console.log(`   Database: ${options.db}`);

            // Try to connect to SQLite database
            try {
                // Dynamic import for better-sqlite3
                const Database = (await import('better-sqlite3')).default;
                const db = new Database(options.db, { readonly: true });

                const members = db
                    .prepare(
                        `SELECT account, expiry FROM role_members 
             WHERE contract_id = ? AND role = ? 
             ORDER BY last_updated DESC`
                    )
                    .all(options.contract, options.role) as Array<{ account: string; expiry: number }>;

                if (members.length === 0) {
                    console.log('\nNo members found for this role.');
                    console.log('Note: Make sure the indexer has run and populated the database.');
                } else {
                    console.log(`\nMembers (${members.length} total):`);
                    console.log('─'.repeat(80));

                    const now = Math.floor(Date.now() / 1000);

                    for (const member of members) {
                        const expiryStr =
                            member.expiry === 0 ? 'Never' : new Date(member.expiry * 1000).toISOString();
                        const isExpired = member.expiry !== 0 && member.expiry < now;
                        const status = isExpired ? '⚠️ EXPIRED' : '✅ Active';

                        console.log(`  ${member.account}`);
                        console.log(`    Expiry: ${expiryStr} ${status}`);
                    }
                }

                db.close();
            } catch (dbError) {
                console.log('\n⚠️  Could not read indexer database.');
                console.log('Please run the indexer first:');
                console.log(`  node indexer/index.js --rpc <RPC_URL> --db ${options.db}`);
                console.log('\nNote: On-chain enumeration is expensive. Use the indexer for listing.');
            }
        } catch (error) {
            console.error('Failed to list members:', error);
            process.exit(1);
        }
    });

// =============================================================================
// Lint Command
// =============================================================================

program
    .command('lint')
    .description('Run configuration lint checks on an RBAC contract')
    .requiredOption('--contract <contractId>', 'RBAC contract ID')
    .option('--rpc <rpcUrl>', 'Soroban RPC URL', 'https://soroban-testnet.stellar.org')
    .option('--db <path>', 'Path to indexer database', './indexer/indexer.db')
    .option('--json', 'Output results as JSON', false)
    .action(async (options) => {
        console.log(`\n🔍 Running lint checks on contract ${options.contract}...`);

        const checks: LintResult[] = [];

        // Check 1: default_admin_held_by_deployer
        checks.push(await checkDefaultAdminHeldByDeployer(options.contract, options.db));

        // Check 2: roles_without_admin
        checks.push(...(await checkRolesWithoutAdmin(options.contract, options.db)));

        // Check 3: temporary_roles_without_expiry_marker
        checks.push(...(await checkTemporaryRolesWithoutExpiry(options.contract, options.db)));

        // Check 4: expired_roles_present
        checks.push(...(await checkExpiredRolesPresent(options.contract, options.db)));

        // Generate report
        const report: LintReport = {
            contractId: options.contract,
            timestamp: new Date().toISOString(),
            checks,
            summary: {
                total: checks.length,
                info: checks.filter((c) => c.severity === 'INFO').length,
                warnings: checks.filter((c) => c.severity === 'WARN').length,
                errors: checks.filter((c) => c.severity === 'ERROR').length,
            },
        };

        // Output
        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            printLintReport(report);
        }
    });

// =============================================================================
// Lint Check Functions
// =============================================================================

async function checkDefaultAdminHeldByDeployer(
    contractId: string,
    dbPath: string
): Promise<LintResult> {
    try {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        // Get deployer
        const contract = db
            .prepare('SELECT * FROM contracts WHERE id = ?')
            .get(contractId) as { id: string } | undefined;

        // Check if DEFAULT_ADMIN_ROLE has only one member (the deployer)
        const adminMembers = db
            .prepare(
                `SELECT account FROM role_members 
         WHERE contract_id = ? AND role = 'DEF_ADMIN'`
            )
            .all(contractId) as Array<{ account: string }>;

        db.close();

        if (adminMembers.length <= 1) {
            return {
                check: 'default_admin_held_by_deployer',
                severity: 'WARN',
                message:
                    'DEFAULT_ADMIN_ROLE is only assigned to one account (likely the deployer). Consider rotating to a multisig.',
                details: {
                    adminCount: adminMembers.length,
                    admins: adminMembers.map((m) => m.account),
                },
            };
        }

        return {
            check: 'default_admin_held_by_deployer',
            severity: 'INFO',
            message: 'DEFAULT_ADMIN_ROLE is properly distributed.',
            details: { adminCount: adminMembers.length },
        };
    } catch {
        return {
            check: 'default_admin_held_by_deployer',
            severity: 'INFO',
            message: 'Could not check (indexer database not available)',
        };
    }
}

async function checkRolesWithoutAdmin(
    contractId: string,
    dbPath: string
): Promise<LintResult[]> {
    const results: LintResult[] = [];

    try {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        const roles = db
            .prepare(
                `SELECT role, admin_role FROM roles 
         WHERE contract_id = ? AND (admin_role IS NULL OR admin_role = 'NONE')`
            )
            .all(contractId) as Array<{ role: string; admin_role: string | null }>;

        db.close();

        for (const role of roles) {
            results.push({
                check: 'roles_without_admin',
                severity: 'WARN',
                message: `Role "${role.role}" has no admin role set.`,
                details: { role: role.role, adminRole: role.admin_role },
            });
        }

        if (roles.length === 0) {
            results.push({
                check: 'roles_without_admin',
                severity: 'INFO',
                message: 'All roles have admin roles properly configured.',
            });
        }
    } catch {
        results.push({
            check: 'roles_without_admin',
            severity: 'INFO',
            message: 'Could not check (indexer database not available)',
        });
    }

    return results;
}

async function checkTemporaryRolesWithoutExpiry(
    contractId: string,
    dbPath: string
): Promise<LintResult[]> {
    const results: LintResult[] = [];

    try {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        // Look for roles that appear temporary (naming convention) but have expiry=0
        const suspiciousMembers = db
            .prepare(
                `SELECT role, account, expiry FROM role_members 
         WHERE contract_id = ? 
           AND expiry = 0 
           AND (role LIKE '%TEMP%' OR role LIKE '%TRIAL%' OR role LIKE '%TEST%')`
            )
            .all(contractId) as Array<{ role: string; account: string; expiry: number }>;

        db.close();

        for (const member of suspiciousMembers) {
            results.push({
                check: 'temporary_roles_without_expiry_marker',
                severity: 'WARN',
                message: `Role "${member.role}" appears temporary but member ${member.account} has no expiry.`,
                details: { role: member.role, account: member.account },
            });
        }

        if (suspiciousMembers.length === 0) {
            results.push({
                check: 'temporary_roles_without_expiry_marker',
                severity: 'INFO',
                message: 'No temporary roles with missing expiry markers found.',
            });
        }
    } catch {
        results.push({
            check: 'temporary_roles_without_expiry_marker',
            severity: 'INFO',
            message: 'Could not check (indexer database not available)',
        });
    }

    return results;
}

async function checkExpiredRolesPresent(
    contractId: string,
    dbPath: string
): Promise<LintResult[]> {
    const results: LintResult[] = [];
    const now = Math.floor(Date.now() / 1000);

    try {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath, { readonly: true });

        const expiredMembers = db
            .prepare(
                `SELECT role, account, expiry FROM role_members 
         WHERE contract_id = ? AND expiry > 0 AND expiry < ?`
            )
            .all(contractId, now) as Array<{ role: string; account: string; expiry: number }>;

        db.close();

        for (const member of expiredMembers) {
            results.push({
                check: 'expired_roles_present',
                severity: 'WARN',
                message: `Role "${member.role}" has expired for ${member.account}.`,
                details: {
                    role: member.role,
                    account: member.account,
                    expiredAt: new Date(member.expiry * 1000).toISOString(),
                },
            });
        }

        if (expiredMembers.length === 0) {
            results.push({
                check: 'expired_roles_present',
                severity: 'INFO',
                message: 'No expired role assignments found.',
            });
        }
    } catch {
        results.push({
            check: 'expired_roles_present',
            severity: 'INFO',
            message: 'Could not check (indexer database not available)',
        });
    }

    return results;
}

function printLintReport(report: LintReport): void {
    console.log('\n' + '═'.repeat(80));
    console.log('RBAC LINT REPORT');
    console.log('═'.repeat(80));
    console.log(`Contract: ${report.contractId}`);
    console.log(`Time: ${report.timestamp}`);
    console.log('─'.repeat(80));

    for (const check of report.checks) {
        const icon =
            check.severity === 'ERROR' ? '❌' : check.severity === 'WARN' ? '⚠️ ' : 'ℹ️ ';
        console.log(`${icon} [${check.check}]`);
        console.log(`   ${check.message}`);
        if (check.details) {
            console.log(`   Details: ${JSON.stringify(check.details)}`);
        }
    }

    console.log('─'.repeat(80));
    console.log('SUMMARY');
    console.log(`   Total Checks: ${report.summary.total}`);
    console.log(`   Info: ${report.summary.info}`);
    console.log(`   Warnings: ${report.summary.warnings}`);
    console.log(`   Errors: ${report.summary.errors}`);
    console.log('═'.repeat(80));
}

// =============================================================================
// Run CLI
// =============================================================================

program.parse();
