//! # SecureVault Example Contract
//!
//! This contract demonstrates how to compose the RBAC contract for authorization.
//! It implements a simple vault that stores tokens and requires the `WITHDRAWER`
//! role to withdraw funds.
//!
//! ## Usage Flow
//! 1. Deploy RBAC contract and SecureVault
//! 2. Initialize SecureVault with RBAC contract address
//! 3. Create WITHDRAWER role in RBAC
//! 4. Grant WITHDRAWER role to authorized accounts
//! 5. Only accounts with WITHDRAWER role can call `withdraw`
//!
//! ## Integration Test Sequence
//! 1. Grant WITHDRAWER role → withdraw succeeds
//! 2. Revoke WITHDRAWER role → withdraw fails

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

// =============================================================================
// Constants
// =============================================================================

/// The role required to withdraw from the vault
const WITHDRAWER_ROLE: Symbol = symbol_short!("WITHDRAW");

// =============================================================================
// Storage Keys
// =============================================================================

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The RBAC contract address
    RbacAddress,
    /// The vault balance
    Balance,
    /// Whether the vault is initialized
    Initialized,
}

// =============================================================================
// Errors
// =============================================================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    /// Caller is not authorized (doesn't have WITHDRAWER role)
    NotAuthorized = 1,
    /// Insufficient balance in vault
    InsufficientBalance = 2,
    /// Vault already initialized
    AlreadyInitialized = 3,
    /// Vault not initialized
    NotInitialized = 4,
    /// Invalid amount
    InvalidAmount = 5,
}

// =============================================================================
// RBAC Contract Client Interface
// =============================================================================

// Define the interface for calling the RBAC contract
mod rbac_client {
    use soroban_sdk::{contractclient, Address, Env, Symbol};

    #[contractclient(name = "RbacClient")]
    pub trait RbacContract {
        fn has_role(env: Env, role: Symbol, account: Address) -> bool;
        fn require_role(env: Env, role: Symbol, account: Address);
    }
}

// =============================================================================
// Contract
// =============================================================================

#[contract]
pub struct SecureVaultContract;

#[contractimpl]
impl SecureVaultContract {
    /// Initialize the vault with an RBAC contract address.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `rbac_address` - The address of the deployed RBAC contract
    /// * `initial_balance` - Initial vault balance (for demo purposes)
    pub fn initialize(
        env: Env,
        rbac_address: Address,
        initial_balance: i128,
    ) -> Result<(), VaultError> {
        // Check not already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(VaultError::AlreadyInitialized);
        }

        // Store RBAC address
        env.storage()
            .instance()
            .set(&DataKey::RbacAddress, &rbac_address);

        // Set initial balance
        env.storage()
            .instance()
            .set(&DataKey::Balance, &initial_balance);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        Ok(())
    }

    /// Deposit funds into the vault.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `amount` - Amount to deposit
    ///
    /// # Note
    /// In a real implementation, this would transfer tokens from the caller.
    /// For this demo, we simply add to the balance.
    pub fn deposit(env: Env, amount: i128) -> Result<(), VaultError> {
        Self::ensure_initialized(&env)?;

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current_balance + amount));

        Ok(())
    }

    /// Withdraw funds from the vault.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `caller` - The address requesting withdrawal
    /// * `amount` - Amount to withdraw
    ///
    /// # Authorization
    /// Caller must have the WITHDRAWER role in the RBAC contract.
    ///
    /// # Demo Note
    /// In a real implementation, this would:
    /// 1. Check caller.require_auth()
    /// 2. Transfer tokens to the caller
    /// For this demo, we check RBAC and update balance.
    pub fn withdraw(env: Env, caller: Address, amount: i128) -> Result<(), VaultError> {
        Self::ensure_initialized(&env)?;

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        // Get RBAC contract address
        let rbac_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RbacAddress)
            .ok_or(VaultError::NotInitialized)?;

        // Check authorization via RBAC
        // Create client for RBAC contract
        let rbac_client = rbac_client::RbacClient::new(&env, &rbac_address);

        // Check if caller has WITHDRAWER role
        let has_role = rbac_client.has_role(&WITHDRAWER_ROLE, &caller);
        if !has_role {
            return Err(VaultError::NotAuthorized);
        }

        // Check balance
        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0);

        if current_balance < amount {
            return Err(VaultError::InsufficientBalance);
        }

        // Update balance
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(current_balance - amount));

        Ok(())
    }

    /// Get the current vault balance.
    pub fn get_balance(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance)
            .unwrap_or(0)
    }

    /// Get the RBAC contract address.
    pub fn get_rbac_address(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::RbacAddress)
    }

    /// Get the WITHDRAWER role symbol.
    pub fn withdrawer_role(_env: Env) -> Symbol {
        WITHDRAWER_ROLE
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    fn ensure_initialized(env: &Env) -> Result<(), VaultError> {
        if !env
            .storage()
            .instance()
            .get::<DataKey, bool>(&DataKey::Initialized)
            .unwrap_or(false)
        {
            return Err(VaultError::NotInitialized);
        }
        Ok(())
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    // For integration tests with RBAC, we would need to:
    // 1. Deploy RBAC contract
    // 2. Deploy SecureVault with RBAC address
    // 3. Test the grant -> withdraw -> revoke -> fail sequence
    //
    // These tests demonstrate the basic vault functionality.
    // Full integration tests are in the tests/ directory.

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SecureVaultContract, ());
        let client = SecureVaultContractClient::new(&env, &contract_id);

        let rbac_address = Address::generate(&env);
        let initial_balance = 1000i128;

        client.initialize(&rbac_address, &initial_balance);

        assert_eq!(client.get_balance(), initial_balance);
        assert_eq!(client.get_rbac_address(), Some(rbac_address));
    }

    #[test]
    fn test_deposit() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SecureVaultContract, ());
        let client = SecureVaultContractClient::new(&env, &contract_id);

        let rbac_address = Address::generate(&env);
        client.initialize(&rbac_address, &1000);

        client.deposit(&500);
        assert_eq!(client.get_balance(), 1500);
    }

    #[test]
    fn test_double_initialize_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SecureVaultContract, ());
        let client = SecureVaultContractClient::new(&env, &contract_id);

        let rbac_address = Address::generate(&env);
        client.initialize(&rbac_address, &1000);

        // Second initialization should fail
        let result = client.try_initialize(&rbac_address, &500);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_deposit_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SecureVaultContract, ());
        let client = SecureVaultContractClient::new(&env, &contract_id);

        let rbac_address = Address::generate(&env);
        client.initialize(&rbac_address, &1000);

        // Zero amount should fail
        let result = client.try_deposit(&0);
        assert!(result.is_err());

        // Negative amount should fail
        let result = client.try_deposit(&-100);
        assert!(result.is_err());
    }

    #[test]
    fn test_withdrawer_role_symbol() {
        let env = Env::default();
        let contract_id = env.register(SecureVaultContract, ());
        let client = SecureVaultContractClient::new(&env, &contract_id);

        let role = client.withdrawer_role();
        assert_eq!(role, symbol_short!("WITHDRAW"));
    }

    // Integration test demonstrating the full flow would go here
    // See examples/secure_vault/tests/integration.rs for the complete test
}
