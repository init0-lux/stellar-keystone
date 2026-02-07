//! # Stellar Keystone RBAC Contract
//!
//! A production-grade Role-Based Access Control (RBAC) primitive for Soroban.
//!
//! ## Features
//! - Role creation with admin hierarchy
//! - Time-limited role grants with expiry
//! - Event emissions for indexing
//! - Composable authorization checks
//!
//! ## Module Structure
//! - [`storage`] - Storage key types
//! - [`errors`] - Error definitions
//! - [`events`] - Event emission functions
//!
//! ## Storage Keys
//! - `ROLE_ADMIN` — Maps role to its admin role
//! - `ROLE_MEMBER` — Maps (role, account) to membership status
//! - `ROLE_EXPIRY` — Maps (role, account) to expiry timestamp (0 = never)
//!
//! ## Usage
//! ```ignore
//! // Create a role with an admin
//! rbac::create_role(env, Symbol::new("WITHDRAWER"), Symbol::new("DEFAULT_ADMIN_ROLE"));
//!
//! // Grant the role to an account
//! rbac::grant_role(env, Symbol::new("WITHDRAWER"), account_address, 0); // 0 = never expires
//!
//! // Check authorization in your contract
//! rbac::require_role(env, Symbol::new("WITHDRAWER"), caller);
//! ```

#![no_std]

mod errors;
mod events;
mod storage;

// re exported for public api
pub use errors::RbacError;
pub use storage::DataKey;

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

/// The default admin role symbol with supreme authority over all roles.
///
/// # Important
/// - **Reserved role:** `DEFAULT_ADMIN_ROLE` must always exist and cannot be deleted.
/// - The on-chain symbol is `"DEF_ADMIN"` (9 char limit for `symbol_short!`).
/// - Frontends should use the `default_admin_role()` getter rather than hardcoding.
/// - This should be assigned to a multisig or timelock in production.
///
/// # Warning
/// If all `DEFAULT_ADMIN_ROLE` holders revoke themselves, the contract becomes
/// administratively frozen — no new roles can be created, no admins can be changed.
pub const DEFAULT_ADMIN_ROLE: Symbol = symbol_short!("DEF_ADMIN");

#[contract]
pub struct RbacContract;

#[contractimpl]
impl RbacContract {
    /// Initialize the RBAC contract.
    /// Sets the deployer as the initial holder of DEFAULT_ADMIN_ROLE.
    ///
    /// # Arguments
    /// * `admin` - The address to grant DEFAULT_ADMIN_ROLE to
    ///
    /// # Panics
    /// Panics if the contract is already initialized.
    ///
    /// # Note
    /// - Sets `Initialized` flag first (atomicity guarantee)
    /// - Stores `RoleExists(DEFAULT_ADMIN_ROLE)` to encode the invariant structurally
    pub fn initialize(env: Env, admin: Address) {
        // Ensure not already initialized (use persistent storage)
        if env.storage().persistent().has(&DataKey::Initialized) {
            panic!("Already initialized");
        }

        // Set initialized FIRST (atomicity: any failure after this is visible)
        env.storage().persistent().set(&DataKey::Initialized, &true);

        // Store deployer in persistent storage
        env.storage().persistent().set(&DataKey::Deployer, &admin);

        // Setup DEFAULT_ADMIN_ROLE
        let role = DEFAULT_ADMIN_ROLE;

        // Mark role as existing (structural invariant)
        env.storage()
            .persistent()
            .set(&DataKey::RoleExists(role.clone()), &true);

        // Set role admin (self-admin for DEFAULT_ADMIN_ROLE)
        env.storage()
            .persistent()
            .set(&DataKey::RoleAdmin(role.clone()), &role);

        // Grant membership to admin
        env.storage()
            .persistent()
            .set(&DataKey::RoleMember(role.clone(), admin.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::RoleExpiry(role.clone(), admin.clone()), &0u64);

        // Emit events
        events::role_created(&env, role.clone(), role.clone());
        events::role_granted(&env, role, admin.clone(), 0, admin);
    }

    // =========================================================================
    // Role Management
    // =========================================================================

    /// Create a new role with a specified admin role.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address invoking this function (must have DEFAULT_ADMIN_ROLE)
    /// * `role` - The role symbol to create
    /// * `admin_role` - The role that administers this new role (must exist)
    ///
    /// # Authorization
    /// Caller must have DEFAULT_ADMIN_ROLE to create new roles.
    ///
    /// # Errors
    /// - `RoleAlreadyExists` if the role already exists
    /// - `NotAuthorized` if caller lacks DEFAULT_ADMIN_ROLE
    /// - `RoleNotFound` if admin_role does not exist
    /// - `InvalidSelfAdmin` if role == admin_role (except DEFAULT_ADMIN_ROLE)
    ///
    /// # Note
    /// Roles are immutable once created. There is no `delete_role` function.
    pub fn create_role(env: Env, caller: Address, role: Symbol, admin_role: Symbol) -> Result<(), RbacError> {
        // Authorize caller
        Self::internal_require_role(&env, DEFAULT_ADMIN_ROLE, &caller)?;

        // Reject if role already exists (strict create-only semantics)
        if env.storage().persistent().has(&DataKey::RoleExists(role.clone())) {
            return Err(RbacError::RoleAlreadyExists);
        }

        // Corruption check: RoleAdmin should not exist without RoleExists
        if env.storage().persistent().has(&DataKey::RoleAdmin(role.clone())) {
            // This should never happen — indicates corrupted state
            panic!("Corrupted state: RoleAdmin exists without RoleExists");
        }

        // Validate admin_role exists
        Self::require_role_exists(&env, &admin_role)?;

        // Disallow self-admin unless it's DEFAULT_ADMIN_ROLE
        if role == admin_role && role != DEFAULT_ADMIN_ROLE {
            return Err(RbacError::InvalidSelfAdmin);
        }

        // Mark role as existing
        env.storage()
            .persistent()
            .set(&DataKey::RoleExists(role.clone()), &true);

        // Store role admin mapping
        env.storage()
            .persistent()
            .set(&DataKey::RoleAdmin(role.clone()), &admin_role);

        // Emit event
        events::role_created(&env, role, admin_role);
        Ok(())
    }

    /// Change the admin role for an existing role.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address invoking this function (must have DEFAULT_ADMIN_ROLE)
    /// * `role` - The role to modify (must exist)
    /// * `admin_role` - The new admin role (must exist)
    ///
    /// # Authorization
    /// Only callable by account with DEFAULT_ADMIN_ROLE.
    ///
    /// # Errors
    /// - `RoleNotFound` if role or admin_role does not exist
    /// - `InvalidSelfAdmin` if role == admin_role (except DEFAULT_ADMIN_ROLE)
    pub fn set_role_admin(env: Env, caller: Address, role: Symbol, admin_role: Symbol) -> Result<(), RbacError> {
        // Only DEFAULT_ADMIN_ROLE can change role admins
        Self::internal_require_role(&env, DEFAULT_ADMIN_ROLE, &caller)?;

        // Validate role exists
        Self::require_role_exists(&env, &role)?;

        // Validate admin_role exists
        Self::require_role_exists(&env, &admin_role)?;

        // Disallow self-admin unless it's DEFAULT_ADMIN_ROLE
        if role == admin_role && role != DEFAULT_ADMIN_ROLE {
            return Err(RbacError::InvalidSelfAdmin);
        }

        // Get previous admin for event
        let previous_admin: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role.clone()))
            .unwrap_or(DEFAULT_ADMIN_ROLE);

        // Update admin role
        env.storage()
            .persistent()
            .set(&DataKey::RoleAdmin(role.clone()), &admin_role);

        // Emit event
        events::role_admin_changed(&env, role, previous_admin, admin_role);
        Ok(())
    }

    // =========================================================================
    // Role Grants
    // =========================================================================

    /// Grant a role to an account with optional expiry.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address invoking this function (must have admin role for this role)
    /// * `role` - The role to grant (must exist)
    /// * `account` - The address to grant the role to
    /// * `expiry` - Unix timestamp when role expires (0 = never)
    ///
    /// # Authorization
    /// Caller must have the admin role for this role.
    ///
    /// # Errors
    /// - `RoleNotFound` if role does not exist
    /// - `InvalidExpiry` if expiry is non-zero and in the past
    pub fn grant_role(
        env: Env,
        caller: Address,
        role: Symbol,
        account: Address,
        expiry: u64,
    ) -> Result<(), RbacError> {
        // Validate role exists
        Self::require_role_exists(&env, &role)?;

        // Get admin role for this role
        let admin_role: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role.clone()))
            .unwrap_or(DEFAULT_ADMIN_ROLE);

        // Caller must have admin role — caller is the granter
        Self::internal_require_role(&env, admin_role, &caller)?;

        // Validate expiry: if non-zero, must be in the future (exclusive semantics)
        // Role valid while current_time < expiry, so expiry must be > current_time
        if expiry != 0 {
            let current_time = env.ledger().timestamp();
            if expiry <= current_time {
                return Err(RbacError::InvalidExpiry);
            }
        }

        // Set membership
        env.storage()
            .persistent()
            .set(&DataKey::RoleMember(role.clone(), account.clone()), &true);

        // Set expiry
        env.storage()
            .persistent()
            .set(&DataKey::RoleExpiry(role.clone(), account.clone()), &expiry);

        // Emit event with correct granter identity
        events::role_granted(&env, role, account, expiry, caller);

        Ok(())
    }

    /// Revoke a role from an account.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address invoking this function (must have admin role for this role)
    /// * `role` - The role to revoke (must exist)
    /// * `account` - The address to revoke the role from
    ///
    /// # Authorization
    /// Caller must have the admin role for this role.
    ///
    /// # Errors
    /// - `RoleNotFound` if role does not exist
    pub fn revoke_role(env: Env, caller: Address, role: Symbol, account: Address) -> Result<(), RbacError> {
        // Validate role exists
        Self::require_role_exists(&env, &role)?;

        // Get admin role for this role
        let admin_role: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role.clone()))
            .unwrap_or(DEFAULT_ADMIN_ROLE);

        // Caller must have admin role — caller is the revoker
        Self::internal_require_role(&env, admin_role, &caller)?;

        // Remove membership and expiry
        env.storage()
            .persistent()
            .remove(&DataKey::RoleMember(role.clone(), account.clone()));

        env.storage()
            .persistent()
            .remove(&DataKey::RoleExpiry(role.clone(), account.clone()));

        // Emit event with correct revoker identity
        events::role_revoked(&env, role, account, caller);
        Ok(())
    }

    // =========================================================================
    // Role Checks
    // =========================================================================

    /// Check if an account has a specific role (pure, no state mutation).
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to check
    /// * `account` - The address to check
    ///
    /// # Returns
    /// `true` if the account has the role and it hasn't expired, `false` otherwise.
    ///
    /// # Note
    /// This is a pure read function. Use `cleanup_expired_role` to remove expired grants.
    pub fn has_role(env: Env, role: Symbol, account: Address) -> bool {
        // Check membership
        let is_member: bool = env
            .storage()
            .persistent()
            .get(&DataKey::RoleMember(role.clone(), account.clone()))
            .unwrap_or(false);

        if !is_member {
            return false;
        }

        // Check expiry
        let expiry: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::RoleExpiry(role.clone(), account.clone()))
            .unwrap_or(0);

        // 0 means never expires
        if expiry == 0 {
            return true;
        }

        // Expiry is exclusive: role valid while current_time < expiry
        env.ledger().timestamp() < expiry
    }

    /// Cleanup an expired role grant, removing it from storage.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to check
    /// * `account` - The address to check
    ///
    /// # Returns
    /// `true` if the role was expired and cleaned up, `false` if still valid or not a member.
    ///
    /// # Note
    /// Emits `RoleExpired` event if the role was expired and removed.
    pub fn cleanup_expired_role(env: Env, role: Symbol, account: Address) -> bool {
        // Check membership
        let is_member: bool = env
            .storage()
            .persistent()
            .get(&DataKey::RoleMember(role.clone(), account.clone()))
            .unwrap_or(false);

        if !is_member {
            return false;
        }

        // Check expiry
        let expiry: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::RoleExpiry(role.clone(), account.clone()))
            .unwrap_or(0);

        // 0 means never expires
        if expiry == 0 {
            return false;
        }

        // Check if expired (same semantics: current_time >= expiry means expired)
        let current_time = env.ledger().timestamp();
        if current_time >= expiry {
            // Clean up expired membership
            env.storage()
                .persistent()
                .remove(&DataKey::RoleMember(role.clone(), account.clone()));
            env.storage()
                .persistent()
                .remove(&DataKey::RoleExpiry(role.clone(), account.clone()));

            // Emit expiry event
            events::role_expired(&env, role, account, expiry);
            return true;
        }

        false
    }

    /// Check if an account has a specific role, returning an error if not.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to require
    /// * `account` - The address to check
    ///
    /// # Returns
    /// `Ok(())` if the account has the role, `Err(NotAuthorized)` otherwise.
    ///
    /// # Note
    /// When called via the generated client, the error will cause a panic.
    pub fn require_role(env: Env, role: Symbol, account: Address) -> Result<(), RbacError> {
        if !Self::has_role(env, role, account) {
            return Err(RbacError::NotAuthorized);
        }
        Ok(())
    }

    // =========================================================================
    // Getters
    // =========================================================================

    /// Get the expiry timestamp for a role grant.
    ///
    /// # Returns
    /// The expiry timestamp (0 = never expires), or 0 if not a member.
    pub fn get_role_expiry(env: Env, role: Symbol, account: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::RoleExpiry(role, account))
            .unwrap_or(0)
    }

    /// Get the admin role for a role.
    ///
    /// # Returns
    /// The admin role symbol, or DEFAULT_ADMIN_ROLE if role doesn't exist.
    pub fn get_role_admin(env: Env, role: Symbol) -> Symbol {
        env.storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role))
            .unwrap_or(DEFAULT_ADMIN_ROLE)
    }

    /// Check if a role exists.
    ///
    /// # Returns
    /// `true` if the role has been created, `false` otherwise.
    pub fn role_exists(env: Env, role: Symbol) -> bool {
        env.storage().persistent().has(&DataKey::RoleExists(role))
    }

    /// Get the deployer address.
    ///
    /// # Note
    /// Returns the address that initialized the contract.
    pub fn get_deployer(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Deployer)
    }

    /// Get the DEFAULT_ADMIN_ROLE symbol.
    pub fn default_admin_role(_env: Env) -> Symbol {
        DEFAULT_ADMIN_ROLE
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    /// Check that a role exists.
    ///
    /// # Returns
    /// `Ok(())` if role exists, `Err(RoleNotFound)` otherwise.
    fn require_role_exists(env: &Env, role: &Symbol) -> Result<(), RbacError> {
        if !env.storage().persistent().has(&DataKey::RoleExists(role.clone())) {
            return Err(RbacError::RoleNotFound);
        }
        Ok(())
    }

    /// Internal function to verify caller has a required role.
    /// 
    /// # Arguments
    /// * `caller` - The address to authenticate and check role for
    ///
    /// # Authorization
    /// This is the single source of auth for all privileged functions.
    /// Caller must call `require_auth()` on themselves.
    fn internal_require_role(env: &Env, role: Symbol, caller: &Address) -> Result<(), RbacError> {
        // Require cryptographic proof that caller controls this address
        caller.require_auth();

        // Check if caller has the required role
        if !Self::has_role(env.clone(), role, caller.clone()) {
            return Err(RbacError::NotAuthorized);
        }

        Ok(())
    }
}

// =============================================================================
// Tests
// =============================================================================

// automatically stripped by cargo at the time of compilation into wasm
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{symbol_short, Env};

    fn setup_env() -> (Env, Address, RbacContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(RbacContract, ());
        let client = RbacContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, admin, client) = setup_env();

        // Check deployer is set
        let deployer = client.get_deployer();
        assert_eq!(deployer, Some(admin.clone()));

        // Check admin has DEFAULT_ADMIN_ROLE
        let default_admin = client.default_admin_role();
        assert!(client.has_role(&default_admin, &admin));
    }

    #[test]
    fn test_create_role() {
        let (_env, admin, client) = setup_env();

        let role = symbol_short!("WITHDRAW");
        let admin_role = client.default_admin_role();

        client.create_role(&admin, &role, &admin_role);

        // Verify role admin is set
        let stored_admin = client.get_role_admin(&role);
        assert_eq!(stored_admin, admin_role);

        // Verify role exists
        assert!(client.role_exists(&role));
    }

    #[test]
    fn test_grant_and_has_role() {
        let (env, admin, client) = setup_env();

        let role = symbol_short!("WITHDRAW");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        // Grant role to a new account (never expires)
        let account = Address::generate(&env);
        client.grant_role(&admin, &role, &account, &0);

        // Check has_role
        assert!(client.has_role(&role, &account));
    }

    #[test]
    fn test_role_expiry() {
        let (env, admin, client) = setup_env();

        // Set up initial ledger time
        let initial_time = 1000u64;
        env.ledger().with_mut(|li| {
            li.timestamp = initial_time;
        });

        let role = symbol_short!("TEMP");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        // Grant role with expiry in the future
        let account = Address::generate(&env);
        let expiry = initial_time + 1000; // Expires in 1000 seconds
        client.grant_role(&admin, &role, &account, &expiry);

        // Before expiry: has_role should return true
        assert!(client.has_role(&role, &account));

        // Advance time past expiry
        env.ledger().with_mut(|li| {
            li.timestamp = expiry + 1;
        });

        // After expiry: has_role should return false
        assert!(!client.has_role(&role, &account));
    }

    #[test]
    fn test_revoke_role() {
        let (env, admin, client) = setup_env();

        let role = symbol_short!("REVOKE");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        // Grant then revoke
        let account = Address::generate(&env);
        client.grant_role(&admin, &role, &account, &0);
        assert!(client.has_role(&role, &account));

        client.revoke_role(&admin, &role, &account);
        assert!(!client.has_role(&role, &account));
    }

    #[test]
    fn test_require_role_success() {
        let (env, admin, client) = setup_env();

        let role = symbol_short!("REQ");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let account = Address::generate(&env);
        client.grant_role(&admin, &role, &account, &0);

        // Should not panic
        client.require_role(&role, &account);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_require_role_failure() {
        let (env, admin, client) = setup_env();

        let role = symbol_short!("NOTAUTH");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        // Account without role
        let account = Address::generate(&env);

        // Should panic
        client.require_role(&role, &account);
    }

    #[test]
    fn test_get_role_expiry() {
        let (env, admin, client) = setup_env();

        // Set up ledger time
        env.ledger().with_mut(|li| {
            li.timestamp = 1000;
        });

        let role = symbol_short!("EXPIRY");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let account = Address::generate(&env);
        let expiry = 5000u64;
        client.grant_role(&admin, &role, &account, &expiry);

        assert_eq!(client.get_role_expiry(&role, &account), expiry);
    }

    #[test]
    fn test_set_role_admin() {
        let (env, admin, client) = setup_env();

        let role = symbol_short!("ROLE1");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        // Create a new admin role
        let new_admin = symbol_short!("MANAGER");
        client.create_role(&admin, &new_admin, &admin_role);

        // Change admin
        client.set_role_admin(&admin, &role, &new_admin);

        assert_eq!(client.get_role_admin(&role), new_admin);
    }

    #[test]
    fn test_invalid_expiry() {
        let (env, admin, client) = setup_env();

        // Set ledger time
        env.ledger().with_mut(|li| {
            li.timestamp = 5000;
        });

        let role = symbol_short!("INVALID");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let account = Address::generate(&env);

        // Try to grant with expiry in the past - should fail
        let result = client.try_grant_role(&admin, &role, &account, &1000);
        assert!(result.is_err());
    }

    #[test]
    fn test_create_role_with_nonexistent_admin() {
        let (_env, admin, client) = setup_env();

        let role = symbol_short!("NEW_ROLE");
        let ghost_admin = symbol_short!("GHOST"); // Does not exist

        // Should fail with RoleNotFound
        let result = client.try_create_role(&admin, &role, &ghost_admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_set_role_admin_to_nonexistent() {
        let (_env, admin, client) = setup_env();

        let role = symbol_short!("ROLE1");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let ghost_admin = symbol_short!("GHOST"); // Does not exist

        // Should fail with RoleNotFound
        let result = client.try_set_role_admin(&admin, &role, &ghost_admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_self_admin_rejected() {
        let (_env, admin, client) = setup_env();

        let role = symbol_short!("SELFISH");

        // Try to create role with itself as admin - should fail
        let result = client.try_create_role(&admin, &role, &role);
        assert!(result.is_err());
    }

    #[test]
    fn test_cleanup_expired_role() {
        let (env, admin, client) = setup_env();

        // Set up initial ledger time
        let initial_time = 1000u64;
        env.ledger().with_mut(|li| {
            li.timestamp = initial_time;
        });

        let role = symbol_short!("CLEANUP");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let account = Address::generate(&env);
        let expiry = initial_time + 500;
        client.grant_role(&admin, &role, &account, &expiry);

        // Before expiry: cleanup should return false
        assert!(!client.cleanup_expired_role(&role, &account));

        // Advance time past expiry
        env.ledger().with_mut(|li| {
            li.timestamp = expiry + 1;
        });

        // After expiry: cleanup should return true and remove membership
        assert!(client.cleanup_expired_role(&role, &account));

        // Second cleanup should return false (already cleaned)
        assert!(!client.cleanup_expired_role(&role, &account));
    }

    #[test]
    fn test_has_role_is_pure_no_side_effects() {
        let (env, admin, client) = setup_env();

        // Set up initial ledger time
        let initial_time = 1000u64;
        env.ledger().with_mut(|li| {
            li.timestamp = initial_time;
        });

        let role = symbol_short!("PURE");
        let admin_role = client.default_admin_role();
        client.create_role(&admin, &role, &admin_role);

        let account = Address::generate(&env);
        let expiry = initial_time + 500;
        client.grant_role(&admin, &role, &account, &expiry);

        // Advance time past expiry
        env.ledger().with_mut(|li| {
            li.timestamp = expiry + 1;
        });

        // Call has_role twice - should return false both times
        assert!(!client.has_role(&role, &account));
        assert!(!client.has_role(&role, &account));

        // Membership should still exist (has_role is pure, no cleanup)
        // Verify by checking expiry (would be 0 if cleaned)
        let stored_expiry = client.get_role_expiry(&role, &account);
        assert_eq!(stored_expiry, expiry); // Still stored, not cleaned
    }

    #[test]
    fn test_grant_role_nonexistent_role() {
        let (env, admin, client) = setup_env();

        let ghost_role = symbol_short!("GHOST"); // Never created
        let account = Address::generate(&env);

        // Should fail with RoleNotFound
        let result = client.try_grant_role(&admin, &ghost_role, &account, &0);
        assert!(result.is_err());
    }

    #[test]
    fn test_revoke_role_nonexistent_role() {
        let (env, admin, client) = setup_env();

        let ghost_role = symbol_short!("GHOST"); // Never created
        let account = Address::generate(&env);

        // Should fail with RoleNotFound
        let result = client.try_revoke_role(&admin, &ghost_role, &account);
        assert!(result.is_err());
    }

    #[test]
    fn test_default_admin_role_exists_after_init() {
        let (_env, _admin, client) = setup_env();

        // DEFAULT_ADMIN_ROLE should exist after initialization
        let default_admin = client.default_admin_role();
        assert!(client.role_exists(&default_admin));
    }
}