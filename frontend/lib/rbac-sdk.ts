import {
    configureSDK,
    deployRbac,
    createRole,
    grantRole,
    revokeRole,
    hasRole,
    RoleCheckError,
    SimulationError,
    TransactionError,
    NetworkType
} from '@stellar-keystone/sdk';

// Initialize SDK with defaults
configureSDK({
    // If we had a funded backend account, we'd put it here for better simulation reliability
});

export interface RbacOperationResult {
    success: boolean;
    data?: any;
    error?: string;
    txHash?: string;
}

function getNetwork(): NetworkType {
    const net = process.env.NEXT_PUBLIC_NETWORK;
    if (net === 'local' || net === 'testnet') return net;
    return 'testnet';
}

/**
 * Deploy a new RBAC contract
 */
export async function deployContract(
    network: string,
    signerKey: string
): Promise<RbacOperationResult> {
    try {
        const networkType = (network === 'local' || network === 'testnet') ? network : 'testnet';

        // Fetch WASM from public folder
        const response = await fetch('/stellar_keystone_rbac.wasm');
        if (!response.ok) {
            throw new Error('Failed to load contract WASM file');
        }
        const wasmArrayBuffer = await response.arrayBuffer();
        // Convert ArrayBuffer to Buffer for the SDK (polyfilled in browser by webpack/next/vite usually)
        // If Buffer is not available, Uint8Array might work if SDK supports it, but SDK expects Buffer.
        // In Next.js client, Buffer might not be available globally.
        // logic: fetch returns ArrayBuffer. Buffer.from(arrayBuffer) works in Node.
        // In browser, we might need to rely on a polyfill or import { Buffer } from 'buffer'.
        // However, since we are using 'use client', let's try assuming Buffer is polyfilled or use a different approach if it fails.
        // Actually, the JS SDK uses Buffer. If we are in browser, we might need a wrapper.
        const wasmBuffer = Buffer.from(wasmArrayBuffer);

        const result = await deployRbac(networkType, signerKey, wasmBuffer);
        return {
            success: true,
            data: { contractId: result.contractId },
            txHash: result.txHash
        };
    } catch (error: any) {
        console.error('Deployment failed:', error);
        return {
            success: false,
            error: error.message || 'Deployment failed'
        };
    }
}

/**
 * Create a new role
 */
export async function createNewRole(
    contractId: string,
    role: string,
    adminRole: string,
    signerKey: string
): Promise<RbacOperationResult> {
    try {
        const txHash = await createRole(contractId, role, adminRole, signerKey, getNetwork());
        return {
            success: true,
            txHash: txHash
        };
    } catch (error: any) {
        console.error('Create role failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to create role'
        };
    }
}

/**
 * Grant a role to an account
 */
export async function grantUserRole(
    contractId: string,
    role: string,
    account: string,
    expiry: string | undefined, // ISO string or undefined
    signerKey: string
): Promise<RbacOperationResult> {
    try {
        // Pass undefined if expiry is empty string
        const expiryArg = expiry || undefined;
        const txHash = await grantRole(contractId, role, account, expiryArg, signerKey, getNetwork());
        return {
            success: true,
            txHash: txHash
        };
    } catch (error: any) {
        console.error('Grant role failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to grant role'
        };
    }
}

/**
 * Revoke a role from an account
 */
export async function revokeUserRole(
    contractId: string,
    role: string,
    account: string,
    signerKey: string
): Promise<RbacOperationResult> {
    try {
        const txHash = await revokeRole(contractId, role, account, signerKey, getNetwork());
        return {
            success: true,
            txHash: txHash
        };
    } catch (error: any) {
        console.error('Revoke role failed:', error);
        return {
            success: false,
            error: error.message || 'Failed to revoke role'
        };
    }
}

/**
 * Check if account has role (Client-side check)
 */
export async function checkUserRole(
    contractId: string,
    role: string,
    account: string
): Promise<boolean> {
    try {
        return await hasRole(contractId, role, account, {
            network: getNetwork()
        });
    } catch (error) {
        // Return false on error is risky for security, but acceptable for UI states
        // SDK v1 throws RoleCheckError on network issues
        if (error instanceof RoleCheckError) {
            console.warn('Role check failed due to network/simulation error:', error);
        }
        return false;
    }
}
