//! Event types
//! //! Events are emitted using Soroban's contractevent system for off-chain indexing.
//! Note: Using deprecated `publish` method until full migration to `#[contractevent]`.
use soroban_sdk::{contracttype, Address, Env, Symbol};

/// Event emitted when a new role is created.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RoleCreatedEvent {
    pub role: Symbol,
    pub admin_role: Symbol,
}

/// Event emitted when a role's admin is changed.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RoleAdminChangedEvent {
    pub role: Symbol,
    pub previous_admin: Symbol,
    pub new_admin: Symbol,
}

/// Event emitted when a role is granted to an account.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RoleGrantedEvent {
    pub role: Symbol,
    pub account: Address,
    pub expiry: u64,
    pub granted_by: Address,
}

/// Event emitted when a role is revoked from an account.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RoleRevokedEvent {
    pub role: Symbol,
    pub account: Address,
    pub revoked_by: Address,
}

/// Event emitted when a role expires during an access check.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RoleExpiredEvent {
    pub role: Symbol,
    pub account: Address,
    pub expired_at: u64,
}

/// Emit a RoleCreated event.
pub fn role_created(env: &Env, role: Symbol, admin_role: Symbol) {
    env.events().publish(
        (soroban_sdk::symbol_short!("RoleCreat"), role.clone()),
        admin_role,
    );
}

/// Emit a RoleAdminChanged event.
pub fn role_admin_changed(env: &Env, role: Symbol, previous_admin: Symbol, new_admin: Symbol) {
    env.events().publish(
        (soroban_sdk::symbol_short!("AdminChg"), role.clone()),
        (previous_admin, new_admin),
    );
}

/// Emit a RoleGranted event.
pub fn role_granted(env: &Env, role: Symbol, account: Address, expiry: u64, granted_by: Address) {
    env.events().publish(
        (
            soroban_sdk::symbol_short!("RoleGrant"),
            role.clone(),
            account.clone(),
        ),
        (expiry, granted_by),
    );
}

/// Emit a RoleRevoked event.
pub fn role_revoked(env: &Env, role: Symbol, account: Address, revoked_by: Address) {
    env.events().publish(
        (
            soroban_sdk::symbol_short!("RoleRevok"),
            role.clone(),
            account.clone(),
        ),
        revoked_by,
    );
}

/// Emit a RoleExpired event.
pub fn role_expired(env: &Env, role: Symbol, account: Address, expired_at: u64) {
    env.events().publish(
        (
            soroban_sdk::symbol_short!("RoleExpir"),
            role.clone(),
            account.clone(),
        ),
        expired_at,
    );
}
