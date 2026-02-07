/**
 * Example: Deploy RBAC Contract and Grant a Role
 * 
 * This example demonstrates:
 * 1. Deploying the RBAC contract
 * 2. Creating a custom role  
 * 3. Granting the role to an address
 * 4. Checking if the address has the role
 * 
 * Usage:
 *   # Compile the contract first
 *   cd rbac && cargo build --target wasm32-unknown-unknown --release && cd ..
 * 
 *   # Set environment variable
 *   export SIGNER_SECRET=S...  # Your Stellar secret key
 * 
 *   # Run on local network (requires stellar network start local)
 *   npx ts-node examples/deployAndGrant.ts local
 * 
 *   # Or run on testnet (requires funded account)
 *   npx ts-node examples/deployAndGrant.ts testnet
 */

import { deployRbac, createRole, grantRole, hasRole, NetworkType } from '../src/index';
import { Keypair } from '@stellar/stellar-sdk';

async function main() {
    // Get network from command line (default: local)
    const network = (process.argv[2] as NetworkType) || 'local';

    // Get signer key from environment
    const signerSecret = process.env.SIGNER_SECRET;
    if (!signerSecret) {
        console.error('Error: SIGNER_SECRET environment variable not set');
        console.error('Usage: SIGNER_SECRET=S... npx ts-node examples/deployAndGrant.ts [local|testnet]');
        process.exit(1);
    }

    try {
        const signer = Keypair.fromSecret(signerSecret);
        console.log(`\n🚀 Starting RBAC Deployment Example`);
        console.log(`Network: ${network}`);
        console.log(`Signer: ${signer.publicKey()}\n`);

        // Step 1: Deploy RBAC Contract
        console.log('═'.repeat(60));
        console.log('Step 1: Deploying RBAC Contract');
        console.log('═'.repeat(60));
        const startTime = Date.now();

        const { contractId, txHash } = await deployRbac(network, signerSecret);

        const deployTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ Deployment complete in ${deployTime}s`);
        console.log(`   Contract ID: ${contractId}`);
        console.log(`   TX Hash: ${txHash}\n`);

        // Step 2: Create a custom role
        console.log('═'.repeat(60));
        console.log('Step 2: Creating WITHDRAWER Role');
        console.log('═'.repeat(60));

        const createRoleTx = await createRole(
            contractId,
            'WITHDRAWER',
            'DEF_ADMIN',  // Administered by DEFAULT_ADMIN_ROLE
            signerSecret,
            network
        );

        console.log(`\n✅ Role created`);
        console.log(`   TX Hash: ${createRoleTx}\n`);

        // Step 3: Grant the role to a test address
        console.log('═'.repeat(60));
        console.log('Step 3: Granting WITHDRAWER Role');
        console.log('═'.repeat(60));

        // Generate a test address
        const testUser = Keypair.random();
        console.log(`   Test User: ${testUser.publicKey()}`);

        // Grant role with 1-year expiry
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const grantTx = await grantRole(
            contractId,
            'WITHDRAWER',
            testUser.publicKey(),
            expiryDate.toISOString(),
            signerSecret,
            network
        );

        console.log(`\n✅ Role granted`);
        console.log(`   Expiry: ${expiryDate.toISOString()}`);
        console.log(`   TX Hash: ${grantTx}\n`);

        // Step 4: Verify the role grant
        console.log('═'.repeat(60));
        console.log('Step 4: Verifying Role Grant');
        console.log('═'.repeat(60));

        const hasWit hdrawerRole = await hasRole(
            contractId,
            'WITHDRAWER',
            testUser.publicKey()
        );

        if (hasWithdrawerRole) {
            console.log(`\n✅ Verification passed`);
            console.log(`   ${testUser.publicKey().substring(0, 10)}... has WITHDRAWER role\n`);
        } else {
            console.log(`\n❌ Verification failed`);
            console.log(`   ${testUser.publicKey().substring(0, 10)}... does NOT have WITHDRAWER role\n`);
        }

        // Summary
        console.log('═'.repeat(60));
        console.log('🎉 Example Complete!');
        console.log('═'.repeat(60));
        console.log(`\nYou can now use this contract in your applications:`);
        console.log(`   Contract ID: ${contractId}`);
        console.log(`\nNext steps:`);
        console.log(`   • Start the indexer to track events`);
        console.log(`   • View the contract in the frontend`);
        console.log(`   • Grant roles to other addresses`);
        console.log(`   • Use requireRole() in your contracts\n`);

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run the example
main();
