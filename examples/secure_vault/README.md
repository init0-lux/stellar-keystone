# Secure Vault Example

Demonstrates integrating Stellar Keystone RBAC with a vault contract for role-based withdrawal authorization.

## Concept

A vault that requires the `WITHDRAWER` role to withdraw funds, with authorization enforced on-chain by the RBAC contract.

**This pattern mirrors real-world treasury and payout systems where authorization logic must be external, auditable, and revocable.**

## Architecture

```
┌─────────────┐         has_role()        ┌──────────────┐
│   Vault     │ ──────────────────────────▶│ RBAC Contract│
│  Contract   │                            │              │
└─────────────┘                            └──────────────┘
      │                                            │
      │ withdraw()                                 │ grant_role()
      │                                            │ revoke_role()
      ▼                                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Blockchain                           │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- **VaultContract** - Stores funds, checks RBAC before withdrawals
- **RBAC Contract** - Manages `WITHDRAWER` role
- **Integration** - Vault calls `RBAC.has_role()` before allowing withdrawal

## Build

```bash
cd examples/secure_vault
cargo build --target wasm32-unknown-unknown --release
```

## Test

```bash
cargo test
```

## Deploy

1. **Deploy RBAC contract** (see [../../cli/README.md](../../cli/README.md))
   ```bash
   rbac deploy --network testnet
   # Note the contract ID: CXXX...
   ```

2. **Deploy vault with RBAC contract ID**
   ```bash
   soroban contract deploy \
     --wasm target/wasm32-unknown-unknown/release/secure_vault.wasm \
     --network testnet
   ```

3. **Initialize vault**
   ```bash
   soroban contract invoke \
     --id VAULT_ID \
     --network testnet \
     -- initialize \
     --rbac_contract RBAC_CONTRACT_ID
   ```

4. **Grant WITHDRAWER role to authorized accounts**
   ```bash
   rbac grant \
     --contract RBAC_CONTRACT_ID \
     --role WITHDRAWER \
     --address GXXX... \
     --network testnet
   ```

5. **Test withdrawal**
   ```bash
   # This will succeed if account has WITHDRAWER role
   soroban contract invoke \
     --id VAULT_ID \
     --network testnet \
     -- withdraw \
     --account GXXX... \
     --amount 1000
   ```

## Key Patterns

### Cross-Contract Authorization
```rust
// Vault checks RBAC before allowing withdrawal
let has_role = rbac_client.has_role(&WITHDRAWER_ROLE, &account);
if !has_role {
    panic!("Not authorized");
}
```

### Authorization Delegation
- Vault doesn't manage permissions
- RBAC contract is the single source of truth
- Permissions can be revoked without upgrading vault

### Role-Based Limits
- Different roles can have different withdrawal limits
- Temporary access via expiry timestamps
- Audit trail via RBAC events

## Security Considerations

- Vault contract **must** check RBAC on every withdrawal
- RBAC contract ID is immutable after initialization
- Role checks happen on-chain, not client-side

## See Also

- [RBAC Contract](../../rbac/README.md) - Contract documentation
- [CLI](../../cli/README.md) - Deployment and role management
- [SDK](../../js-sdk/README.md) - Programmatic integration

## License

MIT
