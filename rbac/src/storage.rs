//! Storage key types for the RBAC contract.

use soroban_sdk::{contracttype, Address, Symbol};

/// Storage key types for the RBAC contract.
///
/// All keys are stored in **persistent** storage unless noted otherwise.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Maps role symbol to its admin role symbol
    RoleAdmin(Symbol),
    /// Maps (role, account) to boolean membership
    RoleMember(Symbol, Address),
    /// Maps (role, account) to expiry timestamp (u64, 0 = never expires)
    RoleExpiry(Symbol, Address),
    /// Tracks the deployer/admin address (persistent)
    Deployer,
    /// Boolean flag indicating contract is initialized (persistent, set first during init)
    Initialized,
    /// Per-role existence marker (persistent) — every created role has this set to true.
    /// This replaces the previous AllRoles Vec to avoid DoS/size limit issues.
    RoleExists(Symbol),
}

