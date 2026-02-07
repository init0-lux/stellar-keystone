//! Error types
use soroban_sdk::contracterror;

/// error handling
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RbacError {
    /// caller doesnt have required auth role
    NotAuthorized = 1,
    /// role expired
    InvalidExpiry = 2,
    /// role not found
    RoleNotFound = 3,
    /// acc not authorized
    NotMember = 4,
    /// role already exists
    RoleAlreadyExists = 5,
    /// cannot set role as its own admin (except DEFAULT_ADMIN_ROLE)
    InvalidSelfAdmin = 6,
}
