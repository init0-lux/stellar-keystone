/**
 * Event Schemas
 *
 * Canonical event type constants and interfaces that mirror the Rust contract.
 * This file serves as the ABI contract between Rust and TypeScript.
 *
 * IMPORTANT: These constants MUST match the Rust `symbol_short!()` names in
 * `rbac/src/events.rs`. Any changes to Rust event names require updates here.
 *
 * @see file:///home/ojaswiom/stellar-keystone/rbac/src/events.rs
 */

/**
 * SDK/Contract version identifier.
 * Used for compatibility checking and future version negotiation.
 */
export const RBAC_SDK_VERSION = '1.0.0';

/**
 * Contract event version (for future version topic support).
 * This will be emitted as the first topic in events when Phase 2 is complete.
 */
export const RBAC_EVENT_VERSION = 'RBACv1';

/**
 * Canonical event type constants.
 *
 * These MUST match the Rust `symbol_short!()` names:
 * - `RoleCreat` → symbol_short!("RoleCreat")
 * - `RoleGrant` → symbol_short!("RoleGrant")
 * - `RoleRevok` → symbol_short!("RoleRevok")
 * - `AdminChg`  → symbol_short!("AdminChg")
 * - `RoleExpir` → symbol_short!("RoleExpir")
 */
export const EVENT_TYPES = {
    /** Emitted when a new role is created */
    ROLE_CREATED: 'RoleCreat',
    /** Emitted when a role is granted to an account */
    ROLE_GRANTED: 'RoleGrant',
    /** Emitted when a role is revoked from an account */
    ROLE_REVOKED: 'RoleRevok',
    /** Emitted when a role's admin is changed */
    ADMIN_CHANGED: 'AdminChg',
    /** Emitted when a role expires during an access check */
    ROLE_EXPIRED: 'RoleExpir',
} as const;

/**
 * Type for valid event type string values.
 */
export type EventTypeValue = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Mapping from truncated Rust symbol names to human-readable event types.
 */
export const EVENT_TYPE_MAP: Record<string, RoleEventType> = {
    [EVENT_TYPES.ROLE_CREATED]: 'RoleCreated',
    [EVENT_TYPES.ROLE_GRANTED]: 'RoleGranted',
    [EVENT_TYPES.ROLE_REVOKED]: 'RoleRevoked',
    [EVENT_TYPES.ADMIN_CHANGED]: 'RoleAdminChanged',
    [EVENT_TYPES.ROLE_EXPIRED]: 'RoleExpired',
};

/**
 * Human-readable event type names used in the SDK.
 */
export type RoleEventType =
    | 'RoleCreated'
    | 'RoleGranted'
    | 'RoleRevoked'
    | 'RoleAdminChanged'
    | 'RoleExpired';

/**
 * Base interface for all role events.
 */
export interface RoleEventBase {
    /** Human-readable event type */
    type: RoleEventType;
    /** Role name (Symbol) */
    role: string;
    /** Unix timestamp when event was recorded */
    timestamp: number;
    /** Transaction hash or event ID */
    txHash: string;
}

/**
 * Event data for RoleCreated.
 */
export interface RoleCreatedEventData extends RoleEventBase {
    type: 'RoleCreated';
    /** Admin role that manages this role */
    adminRole: string;
}

/**
 * Event data for RoleGranted.
 */
export interface RoleGrantedEventData extends RoleEventBase {
    type: 'RoleGranted';
    /** Account that received the role */
    account: string;
    /** Expiry timestamp (0 = never expires) */
    expiry: number;
    /** Account that granted the role */
    grantedBy: string;
}

/**
 * Event data for RoleRevoked.
 */
export interface RoleRevokedEventData extends RoleEventBase {
    type: 'RoleRevoked';
    /** Account that lost the role */
    account: string;
    /** Account that revoked the role */
    revokedBy: string;
}

/**
 * Event data for RoleAdminChanged.
 */
export interface RoleAdminChangedEventData extends RoleEventBase {
    type: 'RoleAdminChanged';
    /** Previous admin role */
    previousAdmin: string;
    /** New admin role */
    newAdmin: string;
}

/**
 * Event data for RoleExpired.
 */
export interface RoleExpiredEventData extends RoleEventBase {
    type: 'RoleExpired';
    /** Account whose role expired */
    account: string;
    /** Timestamp when the role expired */
    expiry: number;
}

/**
 * Union type for all role events.
 */
export type RoleEvent =
    | RoleCreatedEventData
    | RoleGrantedEventData
    | RoleRevokedEventData
    | RoleAdminChangedEventData
    | RoleExpiredEventData;
