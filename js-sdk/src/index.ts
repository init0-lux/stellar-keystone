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
} from '@stellar/stellar-sdk';

// =============================================================================
// Types
// =============================================================================

export type NetworkType = 'local' | 'testnet';
export type TxHash = string;

export interface DeployResult {
    contractId: string;
    txHash: TxHash;
}

export interface RoleEvent {
    type: 'RoleCreated' | 'RoleGranted' | 'RoleRevoked' | 'RoleAdminChanged' | 'RoleExpired';
    role: string;
    account?: string;
    expiry?: number;
    adminRole?: string;
    previousAdmin?: string;
    newAdmin?: string;
    grantedBy?: string;
    revokedBy?: string;
    timestamp: number;
    txHash: string;
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
 * Deploy a new RBAC contract.
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

    // Get account info
    const account = await server.getAccount(publicKey);

    // Note: In a real implementation, you would:
    // 1. Have the WASM binary available
    // 2. Upload the WASM if not already uploaded
    // 3. Create the contract instance
    //
    // For this demo, we simulate the deployment process.
    // The actual WASM would be compiled from the Rust contract.

    // Create a placeholder contract ID for demo purposes
    // In production, this would come from the actual deployment
    const contractId = `C${'A'.repeat(55)}`; // Placeholder contract ID

    console.log(`[SDK] Deploying RBAC contract to ${network}...`);
    console.log(`[SDK] Signer: ${publicKey}`);

    // In a real deployment, we would:
    // 1. Upload WASM: Operation.uploadContractWasm({ wasm: wasmBuffer })
    // 2. Create contract: Operation.createContractFromAddress(...)
    // 3. Initialize: Call the initialize function

    // For demo, return simulated result
    return {
        contractId,
        txHash: 'simulated_tx_hash_' + Date.now().toString(16),
    };
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
 * Check if an account has a specific role.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to check
 * @param account - The account address to check
 * @param network - Network to use (default: 'testnet')
 * @returns True if the account has the role (and it hasn't expired)
 *
 * @example
 * ```typescript
 * const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', accountAddress);
 * if (hasWithdrawer) {
 *   console.log('Account can withdraw');
 * }
 * ```
 */
export async function hasRole(
    contractId: string,
    role: string,
    account: string,
    network: NetworkType = 'testnet'
): Promise<boolean> {
    const config = NETWORK_CONFIG[network];
    const server = getRpcServer(network);

    // Create contract instance
    const contract = new Contract(contractId);

    // Create a simulated account for read-only call
    // For read-only calls, we can use any valid account
    const simulatedAccount = Keypair.random();
    const accountInfo = await server.getAccount(simulatedAccount.publicKey()).catch(() => null);

    // If we can't get an account, try to simulate directly
    // Build the transaction for simulation
    const tx = new TransactionBuilder(
        accountInfo || {
            accountId: () => simulatedAccount.publicKey(),
            sequenceNumber: () => '0',
            incrementSequenceNumber: () => { },
        } as unknown as import('@stellar/stellar-sdk').Account,
        {
            fee: '100',
            networkPassphrase: config.passphrase,
        }
    )
        .addOperation(
            contract.call(
                'has_role',
                nativeToScVal(role, { type: 'symbol' }),
                new Address(account).toScVal()
            )
        )
        .setTimeout(TX_TIMEOUT)
        .build();

    try {
        const simulation = await server.simulateTransaction(tx);

        if (SorobanRpc.Api.isSimulationError(simulation)) {
            console.error('[SDK] Simulation error:', simulation.error);
            return false;
        }

        if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
            const result = scValToNative(simulation.result.retval);
            return Boolean(result);
        }
    } catch (error) {
        console.error('[SDK] Error checking role:', error);
        return false;
    }

    return false;
}

/**
 * Require a role or throw an error.
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to require
 * @param account - The account address to check
 * @param network - Network to use (default: 'testnet')
 * @throws Error if the account doesn't have the role
 */
export async function requireRoleOrThrow(
    contractId: string,
    role: string,
    account: string,
    network: NetworkType = 'testnet'
): Promise<void> {
    const has = await hasRole(contractId, role, account, network);
    if (!has) {
        throw new Error(`Account ${account} does not have role ${role}`);
    }
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
 */
function parseRoleEvent(rawEvent: SorobanRpc.Api.EventResponse): RoleEvent | null {
    try {
        // Extract topic and data from the event
        const topics = rawEvent.topic.map((t) => scValToNative(t));
        const eventType = String(topics[0]);

        // Map event types
        const typeMap: Record<string, RoleEvent['type']> = {
            RoleCreat: 'RoleCreated',
            RoleGrant: 'RoleGranted',
            RoleRevok: 'RoleRevoked',
            AdminChg: 'RoleAdminChanged',
            RoleExpir: 'RoleExpired',
        };

        const type = typeMap[eventType];
        if (!type) {
            return null;
        }

        const baseEvent: RoleEvent = {
            type,
            role: String(topics[1] || ''),
            timestamp: rawEvent.ledgerClosedAt ? Number(rawEvent.ledgerClosedAt) : 0,
            txHash: rawEvent.id,
        };

        // Add type-specific fields
        if (topics[2]) {
            baseEvent.account = String(topics[2]);
        }

        // Parse the value/data
        const data = scValToNative(rawEvent.value);
        if (type === 'RoleGranted' && Array.isArray(data)) {
            baseEvent.expiry = data[0] as number;
            baseEvent.grantedBy = String(data[1]);
        } else if (type === 'RoleRevoked') {
            baseEvent.revokedBy = String(data);
        } else if (type === 'RoleAdminChanged' && Array.isArray(data)) {
            baseEvent.previousAdmin = String(data[0]);
            baseEvent.newAdmin = String(data[1]);
        } else if (type === 'RoleCreated') {
            baseEvent.adminRole = String(data);
        } else if (type === 'RoleExpired') {
            baseEvent.expiry = Number(data);
        }

        return baseEvent;
    } catch (error) {
        console.error('[SDK] Error parsing event:', error);
        return null;
    }
}

// =============================================================================
// Exports
// =============================================================================

export {
    NETWORK_CONFIG,
    getRpcServer,
    waitForTransaction,
};
