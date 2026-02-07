# Stellar Keystone RBAC Contract

Soroban smart contract implementing hierarchical role-based access control with time-based expiry.

## Quick Start

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test

# Deploy
# See ../cli/README.md for deployment instructions
```

## Structure

```
rbac/
├── src/
│   ├── lib.rs          # Main contract logic (13 public functions)
│   ├── storage.rs      # Storage types and keys
│   ├── events.rs       # Event definitions (5 event types)
│   └── errors.rs       # Error types
├── Cargo.toml          # Dependencies (Soroban SDK v25.0.0)
└── tests/              # Integration tests (planned)
```

## Contract Functions

### Initialization
- `initialize(admin: Address)` - Initialize contract with default admin

### Role Management
- `create_role(role: Symbol, admin_role: Symbol)` - Create new role with admin
- `set_role_admin(role: Symbol, new_admin_role: Symbol)` - Change role's admin

### Role Assignment
- `grant_role(role: Symbol, account: Address, expiry: u64)` - Grant role (0 = never expires)
- `revoke_role(role: Symbol, account: Address)` - Revoke role
- `cleanup_expired_role(role: Symbol, account: Address)` - Remove expired grant

### Role Checking
- `has_role(role: Symbol, account: Address) -> bool` - Check if account has active role
- `require_role(role: Symbol, account: Address)` - Assert role or panic

### Getters
- `get_role_expiry(role: Symbol, account: Address) -> u64` - Get expiry timestamp
- `get_role_admin(role: Symbol) -> Symbol` - Get role's admin role
- `role_exists(role: Symbol) -> bool` - Check if role is defined
- `get_deployer() -> Address` - Get contract deployer
- `default_admin_role() -> Symbol` - Get default admin role constant

## Events

All state changes emit events for indexing:

1. **RoleCreated** - New role defined
2. **RoleGranted** - Role assigned to account
3. **RoleRevoked** - Role removed from account
4. **RoleAdminChanged** - Role admin updated
5. **RoleExpired** - Expired role cleaned up

## Testing

18 unit tests covering:
- Initialization and admin setup
- Role creation and hierarchy
- Grant/revoke with expiry
- Admin changes
- Error conditions

```bash
cargo test
```

## Performance Notes

- Designed for sparse storage access
- No on-chain enumeration (use indexer for queries)
- Event-driven indexing for off-chain role lookups

## Security Model

- **DEFAULT_ADMIN_ROLE** has supreme authority
- Role admins can grant/revoke their managed roles
- Expiry is enforced automatically by `has_role()`
- All mutations require valid signatures

## Integration

See `examples/secure_vault/` for a complete example of integrating RBAC with another contract.

## License

MIT
