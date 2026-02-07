/**
 * Admin Safety Utilities
 *
 * Helper functions to prevent dangerous admin operations like
 * removing the last admin from a role.
 */

import { hasRole, type NetworkType } from './index.js';

/**
 * Options for admin safety checks.
 */
export interface AdminSafetyOptions {
    /** Network to check against */
    network?: NetworkType;
}

/**
 * Check if it's safe to revoke a role from an account.
 *
 * Currently this is a placeholder that always returns true.
 * Full implementation would require:
 * 1. Querying all role holders
 * 2. Checking if this is the last holder
 *
 * TODO: Implement when role enumeration is added to contract
 *
 * @param contractId - The RBAC contract ID
 * @param role - The role to check
 * @param account - The account to potentially revoke from
 * @param options - Additional options
 * @returns True if safe to revoke, false if this would remove the last holder
 *
 * @example
 * ```typescript
 * const safe = await safeToRevokeRole(contractId, 'ADMIN', account);
 * if (!safe) {
 *   console.warn('Cannot revoke - this is the last admin!');
 * }
 * ```
 */
export async function safeToRevokeRole(
    contractId: string,
    role: string,
    account: string,
    options?: AdminSafetyOptions
): Promise<boolean> {
    // Verify the account currently has the role
    const currentlyHasRole = await hasRole(
        contractId,
        role,
        account,
        options?.network ?? 'testnet'
    );

    if (!currentlyHasRole) {
        // Account doesn't have the role, nothing to revoke
        return true;
    }

    // TODO: When role enumeration is available in the contract:
    // 1. Get all accounts with this role
    // 2. Check if this is the only one
    // 3. Return false if it's the last one

    // For now, log a warning and return true
    console.warn(
        `[SDK] safeToRevokeRole: Role enumeration not yet available. ` +
        `Cannot verify if ${account} is the last holder of ${role}. ` +
        `Proceeding with revoke is allowed but may remove last admin.`
    );

    return true;
}

/**
 * Check if revoking an admin would leave the contract without any admins.
 *
 * @param contractId - The RBAC contract ID
 * @param account - The admin account to potentially revoke
 * @param options - Additional options
 * @returns True if safe to revoke, false if this is the last admin
 */
export async function safeToRevokeAdmin(
    contractId: string,
    account: string,
    options?: AdminSafetyOptions
): Promise<boolean> {
    return safeToRevokeRole(contractId, 'DEF_ADMIN', account, options);
}
