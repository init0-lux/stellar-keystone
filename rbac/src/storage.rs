//! storage key types for the RBAC contract.

use soroban_sdk::{contracttype, Address, Symbol};

/// Storage key types for the RBAC contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Maps role symbol to its admin role symbol
    RoleAdmin(Symbol),
    /// Maps (role, account) to boolean membership
    RoleMember(Symbol, Address),
    /// Maps (role, account) to expiry timestamp (u64, 0 = never expires)
    RoleExpiry(Symbol, Address),
    /// Tracks the deployer address for lint checks
    Deployer,
    /// Tracks all created roles for enumeration
    AllRoles,
}
