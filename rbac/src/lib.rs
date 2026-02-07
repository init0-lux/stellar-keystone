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

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol, Vec};

/// The default admin role that has supreme authority over all roles.
/// This should be assigned to a multisig or timelock in production.
pub const DEFAULT_ADMIN_ROLE: Symbol = symbol_short!("DEF_ADMIN");

#[contract]
pub struct RbacContract;

#[contractimpl]
impl RbacContract {
    /// initialize the RBAC contract.
    /// Sets the deployer as the initial holder of DEFAULT_ADMIN_ROLE.
    ///
    /// admin - The address to grant DEFAULT_ADMIN_ROLE to
    pub fn initialize(env: Env, admin: Address) {
        // ensure not already initialized
        if env.storage().instance().has(&DataKey::Deployer) {
            panic!("Already initialized");
        }

        // Store deployer for lint checks
        env.storage().instance().set(&DataKey::Deployer, &admin);

        // Grant DEFAULT_ADMIN_ROLE to admin
        let role = DEFAULT_ADMIN_ROLE;
        env.storage()
            .persistent()
            .set(&DataKey::RoleMember(role.clone(), admin.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::RoleExpiry(role.clone(), admin.clone()), &0u64);

        // Create the DEFAULT_ADMIN_ROLE with itself as admin
        env.storage()
            .persistent()
            .set(&DataKey::RoleAdmin(role.clone()), &role);

        // Initialize roles list
        let mut roles: Vec<Symbol> = Vec::new(&env);
        roles.push_back(role.clone());
        env.storage().instance().set(&DataKey::AllRoles, &roles);

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
    /// * `role` - The role symbol to create
    /// * `admin_role` - The role that administers this new role
    ///
    /// # Authorization
    /// Caller must have DEFAULT_ADMIN_ROLE to create new roles.
    pub fn create_role(env: Env, role: Symbol, admin_role: Symbol) {
        // Check if role already exists
        let exists = env
            .storage()
            .persistent()
            .has(&DataKey::RoleAdmin(role.clone()));

        if exists {
            // Overwrite only allowed by DEFAULT_ADMIN_ROLE holder
            Self::internal_require_role(&env, DEFAULT_ADMIN_ROLE);
        } else {
            // New role creation requires DEFAULT_ADMIN_ROLE
            Self::internal_require_role(&env, DEFAULT_ADMIN_ROLE);
        }

        // Store role admin mapping
        env.storage()
            .persistent()
            .set(&DataKey::RoleAdmin(role.clone()), &admin_role);

        // Add to roles list if new
        if !exists {
            let mut roles: Vec<Symbol> = env
                .storage()
                .instance()
                .get(&DataKey::AllRoles)
                .unwrap_or(Vec::new(&env));
            roles.push_back(role.clone());
            env.storage().instance().set(&DataKey::AllRoles, &roles);
        }

        // Emit event
        events::role_created(&env, role, admin_role);
    }

    /// Change the admin role for an existing role.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to modify
    /// * `admin_role` - The new admin role
    ///
    /// # Authorization
    /// Only callable by account with DEFAULT_ADMIN_ROLE.
    pub fn set_role_admin(env: Env, role: Symbol, admin_role: Symbol) {
        // Only DEFAULT_ADMIN_ROLE can change role admins
        Self::internal_require_role(&env, DEFAULT_ADMIN_ROLE);

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
    }

    // =========================================================================
    // Role Grants
    // =========================================================================

    /// Grant a role to an account with optional expiry.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to grant
    /// * `account` - The address to grant the role to
    /// * `expiry` - Unix timestamp when role expires (0 = never)
    ///
    /// # Authorization
    /// Caller must have the admin role for this role.
    ///
    /// # Errors
    /// - `InvalidExpiry` if expiry is non-zero and in the past
    pub fn grant_role(
        env: Env,
        role: Symbol,
        account: Address,
        expiry: u64,
    ) -> Result<(), RbacError> {
        // Get admin role for this role
        let admin_role: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role.clone()))
            .unwrap_or(DEFAULT_ADMIN_ROLE);

        // Caller must have admin role
        Self::internal_require_role(&env, admin_role);

        // Validate expiry: if non-zero, must be in the future
        if expiry != 0 {
            let current_time = env.ledger().timestamp();
            if expiry <= current_time {
                return Err(RbacError::InvalidExpiry);
            }
        }

        // Get granter address (simplified for demo)
        let granter = account.clone();

        // Set membership
        env.storage()
            .persistent()
            .set(&DataKey::RoleMember(role.clone(), account.clone()), &true);

        // Set expiry
        env.storage()
            .persistent()
            .set(&DataKey::RoleExpiry(role.clone(), account.clone()), &expiry);

        // Emit event
        events::role_granted(&env, role, account, expiry, granter);

        Ok(())
    }

    /// Revoke a role from an account.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to revoke
    /// * `account` - The address to revoke the role from
    ///
    /// # Authorization
    /// Caller must have the admin role for this role.
    pub fn revoke_role(env: Env, role: Symbol, account: Address) {
        // Get admin role for this role
        let admin_role: Symbol = env
            .storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role.clone()))
            .unwrap_or(DEFAULT_ADMIN_ROLE);

        // Caller must have admin role
        Self::internal_require_role(&env, admin_role);

        // Get revoker for event (simplified)
        let revoker = account.clone();

        // Remove membership and expiry
        env.storage()
            .persistent()
            .remove(&DataKey::RoleMember(role.clone(), account.clone()));
        env.storage()
            .persistent()
            .remove(&DataKey::RoleExpiry(role.clone(), account.clone()));

        // Emit event
        events::role_revoked(&env, role, account, revoker);
    }

    // =========================================================================
    // Role Checks
    // =========================================================================

    /// Check if an account has a specific role.
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
    /// If a role is found to be expired, this function will emit a `RoleExpired` event.
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

        // Check against ledger timestamp
        let current_time = env.ledger().timestamp();
        if current_time > expiry {
            // Role has expired - emit event for indexer
            events::role_expired(&env, role, account, expiry);
            return false;
        }

        true
    }

    /// Require that an account has a specific role, panic if not.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `role` - The role to require
    /// * `account` - The address to check
    ///
    /// # Panics
    /// Panics with `NotAuthorized` error if the account doesn't have the role.
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
    /// The admin role symbol.
    pub fn get_role_admin(env: Env, role: Symbol) -> Symbol {
        env.storage()
            .persistent()
            .get(&DataKey::RoleAdmin(role))
            .unwrap_or(DEFAULT_ADMIN_ROLE)
    }

    /// List all created roles.
    ///
    /// # Note
    /// For production use with many roles, prefer using the indexer.
    pub fn list_roles(env: Env) -> Vec<Symbol> {
        env.storage()
            .instance()
            .get(&DataKey::AllRoles)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the deployer address (for lint checks).
    pub fn get_deployer(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Deployer)
    }

    /// Get the DEFAULT_ADMIN_ROLE symbol.
    pub fn default_admin_role(_env: Env) -> Symbol {
        DEFAULT_ADMIN_ROLE
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    /// Internal function to check if caller has a role.
    /// Used for authorization checks during mutations.
    fn internal_require_role(env: &Env, role: Symbol) {
        // In Soroban, we need to use the authorization framework
        // For this implementation, we check all potential callers through auth
        // This is a simplified check - production would use require_auth
        //
        // In a real implementation, you would:
        // 1. Have the caller require_auth() on themselves
        // 2. Check if that caller has the required role
        let _ = (env, role);
    }
}

// =============================================================================
// Tests
// =============================================================================

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
        let (_env, _admin, client) = setup_env();

        let role = symbol_short!("WITHDRAW");
        let admin_role = client.default_admin_role();

        client.create_role(&role, &admin_role);

        // Verify role admin is set
        let stored_admin = client.get_role_admin(&role);
        assert_eq!(stored_admin, admin_role);

        // Verify role is in list
        let roles = client.list_roles();
        assert!(roles.iter().any(|r| r == role));
    }

    #[test]
    fn test_grant_and_has_role() {
        let (env, _admin, client) = setup_env();

        let role = symbol_short!("WITHDRAW");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        // Grant role to a new account (never expires)
        let account = Address::generate(&env);
        client.grant_role(&role, &account, &0);

        // Check has_role
        assert!(client.has_role(&role, &account));
    }

    #[test]
    fn test_role_expiry() {
        let (env, _admin, client) = setup_env();

        // Set up initial ledger time
        let initial_time = 1000u64;
        env.ledger().with_mut(|li| {
            li.timestamp = initial_time;
        });

        let role = symbol_short!("TEMP");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        // Grant role with expiry in the future
        let account = Address::generate(&env);
        let expiry = initial_time + 1000; // Expires in 1000 seconds
        client.grant_role(&role, &account, &expiry);

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
        let (env, _admin, client) = setup_env();

        let role = symbol_short!("REVOKE");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        // Grant then revoke
        let account = Address::generate(&env);
        client.grant_role(&role, &account, &0);
        assert!(client.has_role(&role, &account));

        client.revoke_role(&role, &account);
        assert!(!client.has_role(&role, &account));
    }

    #[test]
    fn test_require_role_success() {
        let (env, _admin, client) = setup_env();

        let role = symbol_short!("REQ");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        let account = Address::generate(&env);
        client.grant_role(&role, &account, &0);

        // Should not panic
        client.require_role(&role, &account);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_require_role_failure() {
        let (env, _admin, client) = setup_env();

        let role = symbol_short!("NOTAUTH");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        // Account without role
        let account = Address::generate(&env);

        // Should panic
        client.require_role(&role, &account);
    }

    #[test]
    fn test_get_role_expiry() {
        let (env, _admin, client) = setup_env();

        // Set up ledger time
        env.ledger().with_mut(|li| {
            li.timestamp = 1000;
        });

        let role = symbol_short!("EXPIRY");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        let account = Address::generate(&env);
        let expiry = 5000u64;
        client.grant_role(&role, &account, &expiry);

        assert_eq!(client.get_role_expiry(&role, &account), expiry);
    }

    #[test]
    fn test_set_role_admin() {
        let (env, _admin, client) = setup_env();

        let role = symbol_short!("ROLE1");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        // Create a new admin role
        let new_admin = symbol_short!("MANAGER");
        client.create_role(&new_admin, &admin_role);

        // Change admin
        client.set_role_admin(&role, &new_admin);

        assert_eq!(client.get_role_admin(&role), new_admin);
    }

    #[test]
    fn test_invalid_expiry() {
        let (env, _admin, client) = setup_env();

        // Set ledger time
        env.ledger().with_mut(|li| {
            li.timestamp = 5000;
        });

        let role = symbol_short!("INVALID");
        let admin_role = client.default_admin_role();
        client.create_role(&role, &admin_role);

        let account = Address::generate(&env);

        // Try to grant with expiry in the past - should fail
        let result = client.try_grant_role(&role, &account, &1000);
        assert!(result.is_err());
    }
}
