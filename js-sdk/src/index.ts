/**
 * @stellar-keystone/sdk
 *
 * JavaScript SDK for interacting with Stellar Keystone RBAC contracts.
 *
 * @example
 * ```typescript
 * import { deployRbac, grantRole, hasRole } from '@stellar-keystone/sdk';
 *
 * // Deploy RBAC contract
 * const { contractId } = await deployRbac('testnet', process.env.SIGNER_KEY!);
 *
 * // Grant a role
 * await grantRole(contractId, 'WITHDRAWER', 'GADDRESS...', undefined, process.env.SIGNER_KEY);
 *
 * // Check role
 * const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', 'GADDRESS...');
 * ```
 */

import {
    Contract,
    Keypair,
    Networks,
    Operation,
    SorobanRpc,
    TransactionBuilder,
    xdr,
    nativeToScVal,
    Address,
    scValToNative,
    hash,
} from '@stellar/stellar-sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { RoleCheckError, SimulationError, TransactionError } from './errors.js';
import { EVENT_TYPE_MAP, RBAC_SDK_VERSION, type RoleEvent } from './event-schemas.js';
import { withRetry } from './retry.js';

// =============================================================================
// Types
// =============================================================================

export type NetworkType = 'local' | 'testnet';
export type TxHash = string;

export interface DeployResult {
    contractId: string;
    txHash: TxHash;
}

// Re-export RoleEvent from event-schemas for backwards compatibility
export type { RoleEvent } from './event-schemas.js';

/**
 * SDK Configuration options.
 */
export interface SDKConfig {
    /**
     * Default read-only account public key for simulation.
     * Used by hasRole() when no specific account is provided.
     * If not set, SDK will attempt to create a simulated account.
     */
    readOnlyAccount?: string;
}

/**
 * Options for hasRole operations.
 */
export interface HasRoleOptions {
    /** Network to use */
    network?: NetworkType;
    /**
     * Account public key to use for simulation sourcing.
     * Overrides SDK-level default.
     */
    readOnlyAccount?: string;
}

// SDK-level configuration
let sdkConfig: SDKConfig = {};

/**
 * Configure SDK-level defaults.
 *
 * @param config - Configuration options
 *
 * @example
 * ```typescript
 * configureSDK({
 *   readOnlyAccount: 'GXXXXXXX...'  // Your known funded account
 * });
 * ```
 */
export function configureSDK(config: Partial<SDKConfig>): void {
    sdkConfig = { ...sdkConfig, ...config };
}

/**
 * Get current SDK configuration.
 */
export function getSDKConfig(): Readonly<SDKConfig> {
    return { ...sdkConfig };
}

// =============================================================================
// Configuration
// =============================================================================

const NETWORK_CONFIG: Record<NetworkType, { rpcUrl: string; passphrase: string }> = {
    local: {
        rpcUrl: 'http://127.0.0.1:8000/soroban/rpc',
        passphrase: 'Standalone Network ; February 2017',
    },
    testnet: {
        rpcUrl: 'https://soroban-testnet.stellar.org',
        passphrase: Networks.TESTNET,
    },
};

// Default timeout for transactions (in seconds)
const TX_TIMEOUT = 30;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert ISO8601 date string to Unix timestamp (seconds).
 *
 * @param isoString - ISO8601 formatted date string (e.g., "2025-12-31T23:59:59Z")
 * @returns Unix timestamp in seconds
 *
 * @example
 * ```typescript
 * const expiry = isoToUnixTimestamp("2025-12-31T23:59:59Z");
 * // Returns 1767225599
 * ```
 */
export function isoToUnixTimestamp(isoString: string): number {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid ISO8601 date string: ${isoString}`);
    }
    return Math.floor(date.getTime() / 1000);
}

/**
 * Convert Unix timestamp to ISO8601 date string.
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns ISO8601 formatted date string
 */
export function unixTimestampToIso(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
}

/**
 * Get RPC server instance for the specified network.
 */
function getRpcServer(network: NetworkType): SorobanRpc.Server {
    const config = NETWORK_CONFIG[network];
    return new SorobanRpc.Server(config.rpcUrl);
}

/**
 * Create a keypair from a secret key.
 */
function getKeypairFromSecret(secret: string): Keypair {
    return Keypair.fromSecret(secret);
}

/**
 * Wait for a transaction to be confirmed.
 */
async function waitForTransaction(
    server: SorobanRpc.Server,
    hash: string
): Promise<SorobanRpc.Api.GetTransactionResponse> {
    let response = await server.getTransaction(hash);

    while (response.status === 'NOT_FOUND') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = await server.getTransaction(hash);
    }

    return response;
}

/**
 * Submit a transaction with simulation and fee estimation.
 */
async function submitTransaction(
    server: SorobanRpc.Server,
    transaction: TransactionBuilder,
    keypair: Keypair
): Promise<{ hash: string; result: SorobanRpc.Api.GetTransactionResponse }> {
    // Build initial transaction
    let tx = transaction.build();

    // Simulate to get resource estimates
    const simulation = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
    }

    // Prepare transaction with estimated resources
    const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

    // Sign the prepared transaction
    preparedTx.sign(keypair);

    // Submit
    const sendResponse = await server.sendTransaction(preparedTx);

    if (sendResponse.status === 'ERROR') {
        throw new Error(`Transaction submission failed: ${sendResponse.errorResult}`);
    }

    // Wait for confirmation
    const result = await waitForTransaction(server, sendResponse.hash);

    if (result.status !== 'SUCCESS') {
        throw new Error(`Transaction failed with status: ${result.status}`);
    }

    return { hash: sendResponse.hash, result };
}

// =============================================================================
// SDK Functions
// =============================================================================

/**
 * Load the compiled RBAC WASM file.
 */
function loadRbacWasm(): Buffer {
    // Try multiple potential paths for the WASM file
    const possiblePaths = [
        resolve(__dirname, '../../rbac/target/wasm32-unknown-unknown/release/stellar_keystone_rbac.wasm'),
        resolve(process.cwd(), 'rbac/target/wasm32-unknown-unknown/release/stellar_keystone_rbac.wasm'),
        resolve(__dirname, '../../../rbac/target/wasm32-unknown-unknown/release/stellar_keystone_rbac.wasm'),
    ];

    for (const wasmPath of possiblePaths) {
        try {
            return readFileSync(wasmPath);
        } catch (e) {
            // Try next path
            continue;
        }
    }

    throw new Error(
        'RBAC WASM file not found. Please compile the contract first:\n' +
        '  cd rbac && cargo build --target wasm32-unknown-unknown --release'
    );
}

/**
 * Deploy a new RBAC contract.
 *
 * This function:
 * 1. Loads the compiled RBAC WASM binary
 * 2. Uploads the WASM to the network
 * 3. Creates a contract instance from the uploaded WASM
 * 4. Initializes the contract with the signer as default admin
 *
 * @param network - Network to deploy to ('local' or 'testnet')
 * @param signerKey - Secret key for signing the deployment transaction
 * @returns Contract ID and transaction hash
 *
 * @example
 * ```typescript
 * const { contractId, txHash } = await deployRbac('testnet', process.env.SIGNER_KEY!);
 * console.log(`Deployed RBAC at ${contractId}`);
 * ```
 */
export async function deployRbac(
    network: NetworkType,
    signerKey: string
): Promise<DeployResult> {
    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    console.log(`[SDK] Deploying RBAC contract to ${network}...`);
    console.log(`[SDK] Signer: ${publicKey}`);

    // Step 1: Load WASM
    console.log('[SDK] Loading WASM binary...');
    const wasmBuffer = loadRbacWasm();
    console.log(`[SDK] WASM loaded: ${wasmBuffer.length} bytes`);

    // Step 2: Upload WASM
    console.log('[SDK] Uploading WASM to network...');
    const account = await server.getAccount(publicKey);

    const uploadTxBuilder = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(Operation.uploadContractWasm({ wasm: wasmBuffer }))
        .setTimeout(TX_TIMEOUT);

    const { hash: uploadTxHash } = await submitTransaction(server, uploadTxBuilder, keypair);
    console.log(`[SDK] WASM uploaded: ${uploadTxHash}`);

    // Compute WASM hash for contract creation
    const wasmHash = hash(wasmBuffer);

    // Step 3: Create contract from uploaded WASM
    console.log('[SDK] Creating contract instance...');

    // Refresh account sequence number
    const account2 = await server.getAccount(publicKey);

    const createTxBuilder = new TransactionBuilder(account2, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            Operation.createCustomContract({
                wasmHash,
                address: new Address(publicKey),
            })
        )
        .setTimeout(TX_TIMEOUT);

    const { hash: createTxHash, result: createResult } = await submitTransaction(
        server,
        createTxBuilder,
        keypair
    );

    // Extract contract ID from result
    const contractId = extractContractId(createResult);
    console.log(`[SDK] Contract created: ${contractId}`);

    // Step 4: Initialize the contract
    console.log('[SDK] Initializing contract...');

    // Refresh account again
    const account3 = await server.getAccount(publicKey);

    const contract = new Contract(contractId);
    const initTxBuilder = new TransactionBuilder(account3, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'initialize',
                new Address(publicKey).toScVal()
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash: initTxHash } = await submitTransaction(server, initTxBuilder, keypair);
    console.log(`[SDK] Contract initialized: ${initTxHash}`);
    console.log(`[SDK] ✅ Deployment complete!`);

    return {
        contractId,
        txHash: initTxHash,
    };
}

/**
 * Extract contract ID from a createCustomContract transaction result.
 */
function extractContractId(result: SorobanRpc.Api.GetTransactionResponse): string {
    if (result.status !== 'SUCCESS') {
        throw new Error('Transaction was not successful');
    }

    // The contract ID is in the return value
    const returnValue = result.returnValue;
    if (!returnValue) {
        throw new Error('No return value in transaction result');
    }

    // Contract ID is returned as an Address ScVal
    try {
        const contractAddress = Address.fromScVal(returnValue);
        return contractAddress.toString();
    } catch (error) {
        throw new Error(`Could not extract contract ID: ${error}`);
    }
}

/**
 * Create a new role in the RBAC contract.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role name to create
 * @param adminRole - The admin role that manages this role
 * @param signerKey - Secret key for signing
 * @param network - Network to use (default: 'testnet')
 * @returns Transaction hash
 */
export async function createRole(
    contractId: string,
    role: string,
    adminRole: string,
    signerKey: string,
    network: NetworkType = 'testnet'
): Promise<TxHash> {
    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    // Get account
    const account = await server.getAccount(publicKey);

    // Create contract instance
    const contract = new Contract(contractId);

    // Build the transaction
    const transaction = new TransactionBuilder(account, {
        fee: '100000', // Will be replaced by simulation
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'create_role',
                new Address(publicKey).toScVal(), // caller
                nativeToScVal(role, { type: 'symbol' }),
                nativeToScVal(adminRole, { type: 'symbol' })
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash } = await submitTransaction(server, transaction, keypair);

    console.log(`[SDK] Created role "${role}" with admin "${adminRole}"`);
    console.log(`[SDK] TX: ${hash}`);

    return hash;
}

/**
 * Grant a role to an account.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to grant
 * @param account - The account address to grant the role to
 * @param expiryIso - Optional ISO8601 expiry date (undefined = never expires)
 * @param signerKey - Secret key for signing
 * @param network - Network to use (default: 'testnet')
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * // Grant with no expiry
 * await grantRole(contractId, 'WITHDRAWER', account, undefined, signerKey);
 *
 * // Grant with expiry
 * await grantRole(contractId, 'WITHDRAWER', account, '2025-12-31T23:59:59Z', signerKey);
 * ```
 */
export async function grantRole(
    contractId: string,
    role: string,
    account: string,
    expiryIso?: string,
    signerKey?: string,
    network: NetworkType = 'testnet'
): Promise<TxHash> {
    if (!signerKey) {
        throw new Error('Signer key is required for grant_role');
    }

    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    // Convert expiry
    const expiryTimestamp = expiryIso ? isoToUnixTimestamp(expiryIso) : 0;

    // Get account
    const signerAccount = await server.getAccount(publicKey);

    // Create contract instance
    const contract = new Contract(contractId);

    // Build the transaction
    const transaction = new TransactionBuilder(signerAccount, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'grant_role',
                new Address(publicKey).toScVal(), // caller
                nativeToScVal(role, { type: 'symbol' }),
                new Address(account).toScVal(),
                nativeToScVal(expiryTimestamp, { type: 'u64' })
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash } = await submitTransaction(server, transaction, keypair);

    console.log(`[SDK] Granted role "${role}" to ${account}`);
    if (expiryIso) {
        console.log(`[SDK] Expires: ${expiryIso}`);
    }
    console.log(`[SDK] TX: ${hash}`);

    return hash;
}

/**
 * Revoke a role from an account.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to revoke
 * @param account - The account address to revoke the role from
 * @param signerKey - Secret key for signing
 * @param network - Network to use (default: 'testnet')
 * @returns Transaction hash
 */
export async function revokeRole(
    contractId: string,
    role: string,
    account: string,
    signerKey?: string,
    network: NetworkType = 'testnet'
): Promise<TxHash> {
    if (!signerKey) {
        throw new Error('Signer key is required for revoke_role');
    }

    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    // Get account
    const signerAccount = await server.getAccount(publicKey);

    // Create contract instance
    const contract = new Contract(contractId);

    // Build the transaction
    const transaction = new TransactionBuilder(signerAccount, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'revoke_role',
                new Address(publicKey).toScVal(), // caller
                nativeToScVal(role, { type: 'symbol' }),
                new Address(account).toScVal()
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash } = await submitTransaction(server, transaction, keypair);

    console.log(`[SDK] Revoked role "${role}" from ${account}`);
    console.log(`[SDK] TX: ${hash}`);

    return hash;
}

/**
 * Change the admin role for a role.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to modify
 * @param newAdminRole - The new admin role
 * @param signerKey - Secret key for signing
 * @param network - Network to use (default: 'testnet')
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * // Transfer WITHDRAWER admin from DEF_ADMIN to OPERATOR
 * await setRoleAdmin(contractId, 'WITHDRAWER', 'OPERATOR', signerKey);
 * ```
 */
export async function setRoleAdmin(
    contractId: string,
    role: string,
    newAdminRole: string,
    signerKey: string,
    network: NetworkType = 'testnet'
): Promise<TxHash> {
    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    // Get account
    const signerAccount = await server.getAccount(publicKey);

    // Create contract instance
    const contract = new Contract(contractId);

    // Build the transaction
    const transaction = new TransactionBuilder(signerAccount, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'set_role_admin',
                new Address(publicKey).toScVal(), // caller
                nativeToScVal(role, { type: 'symbol' }),
                nativeToScVal(newAdminRole, { type: 'symbol' })
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash } = await submitTransaction(server, transaction, keypair);

    console.log(`[SDK] Changed admin for "${role}" to "${newAdminRole}"`);
    console.log(`[SDK] TX: ${hash}`);

    return hash;
}

/**
 * Cleanup an expired role assignment.
 *
 * This explicitly removes expired role storage. Note that has_role()
 * already returns false for expired roles, but this frees up storage.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to cleanup
 * @param account - The account address with expired role
 * @param signerKey - Secret key for signing
 * @param network - Network to use (default: 'testnet')
 * @returns True if role was expired and removed, false otherwise
 *
 * @example
 * ```typescript
 * const wasExpired = await cleanupExpiredRole(contractId, 'AUDITOR', account, signerKey);
 * if (wasExpired) {
 *   console.log('Expired role cleaned up');
 * }
 * ```
 */
export async function cleanupExpiredRole(
    contractId: string,
    role: string,
    account: string,
    signerKey: string,
    network: NetworkType = 'testnet'
): Promise<boolean> {
    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);
    const keypair = getKeypairFromSecret(signerKey);
    const publicKey = keypair.publicKey();

    // Get account
    const signerAccount = await server.getAccount(publicKey);

    // Create contract instance
    const contract = new Contract(contractId);

    // Build the transaction
    const transaction = new TransactionBuilder(signerAccount, {
        fee: '100000',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'cleanup_expired_role',
                nativeToScVal(role, { type: 'symbol' }),
                new Address(account).toScVal()
            )
        )
        .setTimeout(TX_TIMEOUT);

    const { hash, result } = await submitTransaction(server, transaction, keypair);

    // Extract return value (bool indicating if role was expired)
    let wasExpired = false;
    if (result.status === 'SUCCESS' && result.returnValue) {
        wasExpired = scValToNative(result.returnValue) as boolean;
    }

    if (wasExpired) {
        console.log(`[SDK] Cleaned up expired role "${role}" for ${account}`);
    } else {
        console.log(`[SDK] Role "${role}" for ${account} was not expired`);
    }
    console.log(`[SDK] TX: ${hash}`);

    return wasExpired;
}

/**
 * Check if an account has a specific role.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to check
 * @param account - The account address to check
 * @param networkOrOptions - Network string or options object
 * @returns True if the account has the role (and it hasn't expired)
 * @throws {RoleCheckError} On transport or simulation failures
 *
 * @example
 * ```typescript
 * try {
 *   const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', accountAddress);
 *   if (hasWithdrawer) {
 *     console.log('Account can withdraw');
 *   }
 * } catch (error) {
 *   if (error instanceof RoleCheckError) {
 *     console.error('Could not check role - network error');
 *   }
 * }
 * ```
 */
export async function hasRole(
    contractId: string,
    role: string,
    account: string,
    networkOrOptions: NetworkType | HasRoleOptions = 'testnet'
): Promise<boolean> {
    // Parse options
    const options: HasRoleOptions = typeof networkOrOptions === 'string'
        ? { network: networkOrOptions }
        : networkOrOptions;
    const network = options.network ?? 'testnet';
    const readOnlyAccount = options.readOnlyAccount ?? sdkConfig.readOnlyAccount;

    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);

    // Create contract instance
    const contract = new Contract(contractId);

    // Get or create account for simulation
    let sourceAccount: import('@stellar/stellar-sdk').Account;

    if (readOnlyAccount) {
        // Use provided read-only account
        try {
            sourceAccount = await withRetry(() => server.getAccount(readOnlyAccount));
        } catch (error) {
            throw new RoleCheckError(
                `Failed to fetch read-only account ${readOnlyAccount}`,
                error,
                true
            );
        }
    } else {
        // Strict mode: require readOnlyAccount for reliable simulation
        throw new RoleCheckError(
            'No readOnlyAccount configured. ' +
            'Call configureSDK({ readOnlyAccount: "GXXX..." }) or pass { readOnlyAccount: "..." } in options.',
            null,
            false
        );
    }

    // Build the transaction for simulation
    const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: config.passphrase,
    })
        .addOperation(
            contract.call(
                'has_role',
                nativeToScVal(role, { type: 'symbol' }),
                new Address(account).toScVal()
            )
        )
        .setTimeout(TX_TIMEOUT)
        .build();

    // Execute simulation with retry
    let simulation: SorobanRpc.Api.SimulateTransactionResponse;
    try {
        simulation = await withRetry(() => server.simulateTransaction(tx));
    } catch (error) {
        throw new RoleCheckError(
            'Failed to simulate has_role transaction',
            error,
            true
        );
    }

    // Check simulation result
    if (SorobanRpc.Api.isSimulationError(simulation)) {
        throw new RoleCheckError(
            `Simulation failed: ${simulation.error}`,
            simulation,
            false
        );
    }

    if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
        const result = scValToNative(simulation.result.retval);
        return Boolean(result);
    }

    // Unexpected response structure
    throw new RoleCheckError(
        'Unexpected simulation response - no result returned',
        simulation,
        false
    );
}

/**
 * Assert that an account has a role (CLIENT-SIDE CHECK ONLY).
 *
 * ⚠️ SECURITY WARNING: This is a client-side check only. It does NOT
 * enforce authorization - that happens on-chain in the contract.
 *
 * Use this for UX gating (e.g., hiding admin buttons), NOT for
 * security decisions. The contract always has the final say.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to require
 * @param account - The account address to check
 * @param networkOrOptions - Network string or options object
 * @throws Error if the account doesn't have the role
 * @throws RoleCheckError on transport or simulation failures
 */
export async function assertRoleClientSide(
    contractId: string,
    role: string,
    account: string,
    networkOrOptions: NetworkType | HasRoleOptions = 'testnet'
): Promise<void> {
    const has = await hasRole(contractId, role, account, networkOrOptions);
    if (!has) {
        throw new Error(`Account ${account} does not have role ${role}`);
    }
}

/**
 * @deprecated Use `assertRoleClientSide` instead. This function will be removed in v2.
 *
 * This function has been renamed to clarify that it performs a CLIENT-SIDE
 * check only and does NOT enforce security.
 */
export async function requireRoleOrThrow(
    contractId: string,
    role: string,
    account: string,
    network: NetworkType = 'testnet'
): Promise<void> {
    console.warn(
        '[SDK] DEPRECATED: requireRoleOrThrow() is deprecated and will be removed in v2. ' +
        'Use assertRoleClientSide() instead. This is a client-side check only.'
    );
    return assertRoleClientSide(contractId, role, account, network);
}

/**
 * Watch for role events from the RBAC contract.
 *
 * @param contractId - The RBAC contract ID
 * @param callback - Function called for each event
 * @param network - Network to use (default: 'testnet')
 * @param pollInterval - Polling interval in milliseconds (default: 5000)
 *
 * @example
 * ```typescript
 * await watchRoleEvents(contractId, (event) => {
 *   console.log(`${event.type}: ${event.role} - ${event.account}`);
 * });
 * ```
 */
export async function watchRoleEvents(
    contractId: string,
    callback: (event: RoleEvent) => void,
    network: NetworkType = 'testnet',
    pollInterval: number = 5000
): Promise<void> {
    const server = getRpcServer(network);

    let lastCursor: string | undefined;

    const poll = async () => {
        try {
            // Get events from the contract
            const response = await server.getEvents({
                startLedger: lastCursor ? undefined : 1,
                filters: [
                    {
                        type: 'contract',
                        contractIds: [contractId],
                    },
                ],
                cursor: lastCursor,
                limit: 100,
            });

            if (response.events && response.events.length > 0) {
                for (const event of response.events) {
                    // Parse event
                    const parsedEvent = parseRoleEvent(event);
                    if (parsedEvent) {
                        callback(parsedEvent);
                    }
                }

                // Update cursor for next poll
                if (response.events.length > 0) {
                    lastCursor = response.latestLedger?.toString();
                }
            }
        } catch (error) {
            console.error('[SDK] Error polling events:', error);
        }
    };

    // Start polling
    console.log(`[SDK] Watching events for contract ${contractId}...`);
    setInterval(poll, pollInterval);
    await poll(); // Initial poll
}

/**
 * Parse a raw Soroban event into a RoleEvent.
 *
 * Uses canonical event type constants from event-schemas.ts.
 */
function parseRoleEvent(rawEvent: SorobanRpc.Api.EventResponse): RoleEvent | null {
    try {
        // Extract topic and data from the event
        const topics = rawEvent.topic.map((t) => scValToNative(t));
        const eventType = String(topics[0]);

        // Use canonical event type mapping from event-schemas.ts
        const type = EVENT_TYPE_MAP[eventType];
        if (!type) {
            console.warn(
                `[SDK] Unknown event type: "${eventType}". ` +
                `SDK version ${RBAC_SDK_VERSION} may need update, or contract uses newer events.`
            );
            return null;
        }

        // Parse based on event type
        const role = String(topics[1] || '');
        const timestamp = rawEvent.ledgerClosedAt ? Number(rawEvent.ledgerClosedAt) : 0;
        const txHash = rawEvent.id;
        const data = scValToNative(rawEvent.value);

        switch (type) {
            case 'RoleCreated':
                return {
                    type,
                    role,
                    timestamp,
                    txHash,
                    adminRole: String(data),
                };

            case 'RoleGranted':
                return {
                    type,
                    role,
                    timestamp,
                    txHash,
                    account: String(topics[2] || ''),
                    expiry: Array.isArray(data) ? (data[0] as number) : 0,
                    grantedBy: Array.isArray(data) ? String(data[1]) : '',
                };

            case 'RoleRevoked':
                return {
                    type,
                    role,
                    timestamp,
                    txHash,
                    account: String(topics[2] || ''),
                    revokedBy: String(data),
                };

            case 'RoleAdminChanged':
                return {
                    type,
                    role,
                    timestamp,
                    txHash,
                    previousAdmin: Array.isArray(data) ? String(data[0]) : '',
                    newAdmin: Array.isArray(data) ? String(data[1]) : '',
                };

            case 'RoleExpired':
                return {
                    type,
                    role,
                    timestamp,
                    txHash,
                    account: String(topics[2] || ''),
                    expiry: Number(data),
                };

            default:
                // Type guard - should never reach here
                return null;
        }
    } catch (error) {
        console.error('[SDK] Error parsing event:', error);
        return null;
    }
}

// =============================================================================
// Exports
// =============================================================================

// Re-export error types for consumers
export { RoleCheckError, SimulationError, TransactionError } from './errors.js';

// Re-export event schema utilities
export {
    EVENT_TYPES,
    EVENT_TYPE_MAP,
    RBAC_SDK_VERSION,
    RBAC_EVENT_VERSION,
} from './event-schemas.js';

// Re-export retry utilities
export { withRetry, type RetryOptions } from './retry.js';

// Internal utilities (for advanced usage)
export {
    NETWORK_CONFIG,
    getRpcServer,
    waitForTransaction,
};
