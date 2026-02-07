#!/usr/bin/env tsx
/**
 * Stellar Keystone RBAC Demo
 * 
 * Complete demonstration of RBAC features using the JS SDK.
 * 
 * Usage:
 *   DEMO_SIGNER_KEY=SXXX... npx tsx scripts/demo.ts [local|testnet]
 */

import {
    deployRbac,
    createRole,
    grantRole,
    revokeRole,
    hasRole,
    setRoleAdmin,
    cleanupExpiredRole,
    configureSDK,
    RoleCheckError,
    NetworkType,
} from '@stellar-keystone/sdk';
import { Keypair } from '@stellar/stellar-sdk';

// ANSI colors for output
const COLORS = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    BLUE: '\x1b[34m',
    YELLOW: '\x1b[33m',
    CYAN: '\x1b[36m',
    MAGENTA: '\x1b[35m',
};

// Helper functions
function section(title: string, color: string = COLORS.BLUE) {
    console.log(`\n${color}${'='.repeat(60)}${COLORS.RESET}`);
    console.log(`${color}${title}${COLORS.RESET}`);
    console.log(`${color}${'='.repeat(60)}${COLORS.RESET}\n`);
}

function subsection(title: string) {
    console.log(`${COLORS.CYAN}${title}${COLORS.RESET}`);
}

function success(message: string) {
    console.log(`${COLORS.GREEN}✅ ${message}${COLORS.RESET}`);
}

function info(message: string) {
    console.log(`   ${message}`);
}

function oneDay(): string {
    return new Date(Date.now() + 86400 * 1000).toISOString();
}

function oneHour(): string {
    return new Date(Date.now() + 3600 * 1000).toISOString();
}

function fiveMinutes(): string {
    return new Date(Date.now() + 300 * 1000).toISOString();
}

async function runDemo(network: NetworkType, signerSecret: string) {
    console.log(`\n${COLORS.MAGENTA}${'='.repeat(60)}${COLORS.RESET}`);
    console.log(`${COLORS.MAGENTA}  Stellar Keystone RBAC Demo${COLORS.RESET}`);
    console.log(`${COLORS.MAGENTA}  Complete Feature Demonstration${COLORS.RESET}`);
    console.log(`${COLORS.MAGENTA}${'='.repeat(60)}${COLORS.RESET}\n`);

    const signer = Keypair.fromSecret(signerSecret);
    info(`Network: ${network}`);
    info(`Signer: ${signer.publicKey()}`);

    // Configure SDK with signer as read-only account for hasRole simulations
    configureSDK({ readOnlyAccount: signer.publicKey() });

    // =========================================================================
    // Step 1: Deploy Contract
    // =========================================================================
    section('Step 1: Deploy & Initialize Contract');

    const { contractId, txHash } = await deployRbac(network, signerSecret);
    success('Contract deployed and initialized');
    info(`Contract ID: ${contractId}`);
    info(`TX Hash: ${txHash}`);
    info(`Actions performed:`);
    info(`  • Deployed RBAC contract`);
    info(`  • Created DEFAULT_ADMIN_ROLE (DEF_ADMIN)`);
    info(`  • Granted DEF_ADMIN to deployer`);

    // =========================================================================
    // Step 2: Create Role Hierarchy
    // =========================================================================
    section('Step 2: Create Role Hierarchy');

    subsection('[1/4] Creating WITHDRAWER role');
    await createRole(contractId, 'WITHDRAWER', 'DEF_ADMIN', signerSecret, network);
    success('WITHDRAWER created (admin: DEF_ADMIN)');

    subsection('[2/4] Creating OPERATOR role');
    await createRole(contractId, 'OPERATOR', 'DEF_ADMIN', signerSecret, network);
    success('OPERATOR created (admin: DEF_ADMIN)');

    subsection('[3/4] Creating VIEWER role');
    await createRole(contractId, 'VIEWER', 'OPERATOR', signerSecret, network);
    success('VIEWER created (admin: OPERATOR - delegated!)');

    subsection('[4/4] Creating AUDITOR role');
    await createRole(contractId, 'AUDITOR', 'OPERATOR', signerSecret, network);
    success('AUDITOR created (admin: OPERATOR)');

    console.log(`\n${COLORS.YELLOW}  Role Hierarchy:${COLORS.RESET}`);
    info('  DEF_ADMIN (self-admin)');
    info('  ├── WITHDRAWER');
    info('  ├── OPERATOR');
    info('  │   ├── VIEWER');
    info('  │   └── AUDITOR');

    // =========================================================================
    // Step 3: Grant Roles with Various Expiry
    // =========================================================================
    section('Step 3: Grant Roles with Multiple Expiry Scenarios');

    const alice = Keypair.random();
    const bob = Keypair.random();
    const charlie = Keypair.random();
    const dave = Keypair.random();

    subsection('[1/4] Granting WITHDRAWER to Alice (never expires)');
    await grantRole(contractId, 'WITHDRAWER', alice.publicKey(), undefined, signerSecret, network);
    success(`Granted WITHDRAWER to ${alice.publicKey().substring(0, 15)}...`);
    info('  Expiry: Never (permanent)');

    subsection('[2/4] Granting OPERATOR to Bob (24h expiry)');
    const bobExpiry = oneDay();
    await grantRole(contractId, 'OPERATOR', bob.publicKey(), bobExpiry, signerSecret, network);
    success(`Granted OPERATOR to ${bob.publicKey().substring(0, 15)}...`);
    info(`  Expiry: ${bobExpiry}`);

    subsection('[3/4] Granting VIEWER to Charlie (1h expiry)');
    const charlieExpiry = oneHour();
    await grantRole(contractId, 'VIEWER', charlie.publicKey(), charlieExpiry, signerSecret, network);
    success(`Granted VIEWER to ${charlie.publicKey().substring(0, 15)}...`);
    info(`  Expiry: ${charlieExpiry}`);

    subsection('[4/4] Granting AUDITOR to Dave (5min expiry - for cleanup demo)');
    const daveExpiry = fiveMinutes();
    await grantRole(contractId, 'AUDITOR', dave.publicKey(), daveExpiry, signerSecret, network);
    success(`Granted AUDITOR to ${dave.publicKey().substring(0, 15)}...`);
    info(`  Expiry: ${daveExpiry}`);

    // =========================================================================
    // Step 4: Check Role Assignments
    // =========================================================================
    section('Step 4: Check Role Assignments');

    try {
        subsection('Checking Alice has WITHDRAWER...');
        const aliceHasWithdrawer = await hasRole(contractId, 'WITHDRAWER', alice.publicKey(), network);
        success(`Result: ${aliceHasWithdrawer} (role is active, never expires)`);

        subsection('Checking Bob has OPERATOR...');
        const bobHasOperator = await hasRole(contractId, 'OPERATOR', bob.publicKey(), network);
        success(`Result: ${bobHasOperator} (role is active, expires in 24h)`);

        subsection('Checking Alice has VIEWER (should be false)...');
        const aliceHasViewer = await hasRole(contractId, 'VIEWER', alice.publicKey(), network);
        info(`Result: ${aliceHasViewer} (Alice was never granted VIEWER)`);
    } catch (error) {
        if (error instanceof RoleCheckError) {
            console.error(`${COLORS.YELLOW}⚠️  Network error: ${error.message}${COLORS.RESET}`);
            if (error.isTransportError) {
                info('This was a transport failure, not a permission denial');
            }
        }
        throw error;
    }

    // =========================================================================
    // Step 5: Change Role Admin
    // =========================================================================
    section('Step 5: Change Role Admin Hierarchy');

    subsection('Transferring WITHDRAWER admin from DEF_ADMIN to OPERATOR...');
    await setRoleAdmin(contractId, 'WITHDRAWER', 'OPERATOR', signerSecret, network);
    success('Admin changed for WITHDRAWER');
    info('  Previous admin: DEF_ADMIN');
    info('  New admin: OPERATOR');

    console.log(`\n${COLORS.YELLOW}  Updated Hierarchy:${COLORS.RESET}`);
    info('  DEF_ADMIN');
    info('  └── OPERATOR');
    info('      ├── WITHDRAWER (changed!)');
    info('      ├── VIEWER');
    info('      └── AUDITOR');

    // =========================================================================
    // Step 6: Revoke Roles
    // =========================================================================
    section('Step 6: Revoke Roles');

    subsection('Revoking OPERATOR from Bob...');
    await revokeRole(contractId, 'OPERATOR', bob.publicKey(), signerSecret, network);
    success(`Revoked OPERATOR from ${bob.publicKey().substring(0, 15)}...`);

    try {
        subsection('Verifying revocation...');
        const bobStillHasOperator = await hasRole(contractId, 'OPERATOR', bob.publicKey(), network);
        info(`Bob has OPERATOR: ${bobStillHasOperator} (should be false)`);
    } catch (error) {
        if (error instanceof RoleCheckError) {
            console.error(`${COLORS.YELLOW}⚠️  Network error: ${error.message}${COLORS.RESET}`);
        }
    }

    // =========================================================================
    // Step 7: Cleanup Expired Roles (Simulated)
    // =========================================================================
    section('Step 7: Cleanup Expired Roles');

    subsection('Note: Dave\'s AUDITOR role expires in 5 minutes');
    info('In a real scenario, you would wait for expiry and then call cleanupExpiredRole()');
    info('This would emit a RoleExpired event and free up storage');
    info(`Example: cleanupExpiredRole(contractId, 'AUDITOR', '${dave.publicKey().substring(0, 15)}...', signerKey)`);
    console.log();
    info('The contract\'s has_role() already returns false for expired roles,');
    info('but cleanup explicitly removes the storage entry.');

    // =========================================================================
    // Summary
    // =========================================================================
    section('Demo Complete! 🎉', COLORS.GREEN);

    console.log(`${COLORS.CYAN}Features Demonstrated:${COLORS.RESET}`);
    success('Contract deployment & initialization');
    success('Role creation with hierarchical admins');
    success('Role grants with multiple expiry scenarios');
    success('Role checks (has_role)');
    success('Admin role changes (set_role_admin)');
    success('Role revocation (revoke_role)');
    success('Error handling with RoleCheckError');

    console.log(`\n${COLORS.CYAN}Contract Details:${COLORS.RESET}`);
    info(`Contract ID: ${contractId}`);
    info(`Network: ${network}`);

    console.log(`\n${COLORS.CYAN}Next Steps:${COLORS.RESET}`);
    info('1. Start the indexer to track role events:');
    info('     cd indexer && npm start');
    info('');
    info('2. Start the frontend to view roles in a UI:');
    info('     cd frontend && npm run dev');
    info('');
    info('3. Use the CLI to manage roles:');
    info(`     rbac has-role --contract ${contractId} --role WITHDRAWER --address ${alice.publicKey()}`);
    info('');
    info('4. Integrate into your contracts:');
    info('     Use this contract ID for require_role() calls from other contracts');

    console.log(`\n${COLORS.MAGENTA}${'='.repeat(60)}${COLORS.RESET}\n`);
}

// Main execution
async function main() {
    const network = (process.argv[2] as NetworkType) || 'testnet';
    const signerSecret = process.env.DEMO_SIGNER_KEY;

    if (!signerSecret) {
        console.error('Error: DEMO_SIGNER_KEY environment variable not set');
        console.error('Usage: DEMO_SIGNER_KEY=SXXX... npx tsx scripts/demo.ts [local|testnet]');
        process.exit(1);
    }

    try {
        await runDemo(network, signerSecret);
    } catch (error) {
        console.error(`\n${COLORS.YELLOW}❌ Demo failed:${COLORS.RESET}`, error);
        process.exit(1);
    }
}

main();
