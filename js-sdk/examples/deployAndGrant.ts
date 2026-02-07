/**
 * Example: Deploy and Grant Role
 *
 * This example demonstrates deploying an RBAC contract and granting a role.
 *
 * @usage
 * ```bash
 * # Set environment variables
 * export SIGNER_KEY="S..."  # Your Stellar secret key
 *
 * # Run the example
 * npx ts-node examples/deployAndGrant.ts
 * ```
 */

import { deployRbac, createRole, grantRole, hasRole, revokeRole } from '../src/index.js';

// Configuration from environment
const SIGNER_KEY = process.env.SIGNER_KEY;
const NETWORK = (process.env.NETWORK as 'local' | 'testnet') || 'testnet';

// Test account address (replace with actual address)
const TEST_ACCOUNT = process.env.TEST_ACCOUNT || 'GDEMO...';

async function main() {
    console.log('========================================');
    console.log('Stellar Keystone RBAC - Deploy & Grant Example');
    console.log('========================================\n');

    // Validate environment
    if (!SIGNER_KEY) {
        console.error('Error: SIGNER_KEY environment variable is required');
        console.log('Usage: SIGNER_KEY=S... npx ts-node examples/deployAndGrant.ts');
        process.exit(1);
    }

    try {
        // Step 1: Deploy RBAC contract
        console.log('Step 1: Deploying RBAC contract...');
        const { contractId, txHash: deployTxHash } = await deployRbac(NETWORK, SIGNER_KEY);
        console.log(`  Contract ID: ${contractId}`);
        console.log(`  TX Hash: ${deployTxHash}\n`);

        // Step 2: Create WITHDRAWER role
        console.log('Step 2: Creating WITHDRAWER role...');
        const createRoleTxHash = await createRole(
            contractId,
            'WITHDRAWER',
            'DEF_ADMIN', // Admin role from contract
            SIGNER_KEY,
            NETWORK
        );
        console.log(`  TX Hash: ${createRoleTxHash}\n`);

        // Step 3: Grant role to test account
        console.log(`Step 3: Granting WITHDRAWER role to ${TEST_ACCOUNT}...`);
        const grantTxHash = await grantRole(
            contractId,
            'WITHDRAWER',
            TEST_ACCOUNT,
            undefined, // No expiry
            SIGNER_KEY,
            NETWORK
        );
        console.log(`  TX Hash: ${grantTxHash}\n`);

        // Step 4: Verify role
        console.log('Step 4: Verifying role assignment...');
        const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', TEST_ACCOUNT, NETWORK);
        console.log(`  Has WITHDRAWER role: ${hasWithdrawer}\n`);

        // Step 5: Grant with expiry (example)
        console.log('Step 5: Granting role with expiry...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
        const expiryIso = futureDate.toISOString();

        const grantWithExpiryTxHash = await grantRole(
            contractId,
            'WITHDRAWER',
            'GTEMP...', // Another test address
            expiryIso,
            SIGNER_KEY,
            NETWORK
        );
        console.log(`  TX Hash: ${grantWithExpiryTxHash}`);
        console.log(`  Expires: ${expiryIso}\n`);

        // Step 6: Revoke role (optional)
        console.log('Step 6: Revoking role (demo)...');
        const revokeTxHash = await revokeRole(
            contractId,
            'WITHDRAWER',
            TEST_ACCOUNT,
            SIGNER_KEY,
            NETWORK
        );
        console.log(`  TX Hash: ${revokeTxHash}\n`);

        // Step 7: Verify revocation
        console.log('Step 7: Verifying role revocation...');
        const hasAfterRevoke = await hasRole(contractId, 'WITHDRAWER', TEST_ACCOUNT, NETWORK);
        console.log(`  Has WITHDRAWER role after revoke: ${hasAfterRevoke}\n`);

        // Summary
        console.log('========================================');
        console.log('Summary');
        console.log('========================================');
        console.log(`Contract ID: ${contractId}`);
        console.log(`Network: ${NETWORK}`);
        console.log(`Transactions:`);
        console.log(`  - Deploy: ${deployTxHash}`);
        console.log(`  - Create Role: ${createRoleTxHash}`);
        console.log(`  - Grant: ${grantTxHash}`);
        console.log(`  - Revoke: ${revokeTxHash}`);
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the example
main();
