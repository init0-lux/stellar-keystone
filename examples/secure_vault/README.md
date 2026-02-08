# Secure Vault Example

Demonstrates integrating RBAC with a vault contract for role-based withdrawal authorization.

**This pattern mirrors real-world treasury and payout systems where authorization logic must be external, auditable, and revocable.**

## Architecture

```
Vault Contract → RBAC.has_role() → Check storage → Return bool
     │                                                    │
     │ withdraw()                                         │ grant_role()
     ▼                                                    ▼
                        Blockchain
```

**Components:**
- **VaultContract** - Stores funds, checks RBAC before withdrawals
- **RBAC Contract** - Manages `WITHDRAWER` role
- **Integration** - Vault calls `RBAC.has_role()` before allowing withdrawal

## Build & Test

```bash
cd examples/secure_vault
cargo build --target wasm32-unknown-unknown --release
cargo test
```

## Deploy

```bash
# 1. Deploy RBAC (see ../../cli/README.md)
rbac deploy --network testnet  # Note contract ID

# 2. Deploy vault with RBAC contract ID
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/secure_vault.wasm --network testnet

# 3. Initialize vault
soroban contract invoke --id VAULT_ID --network testnet -- initialize --rbac_contract RBAC_ID

# 4. Grant WITHDRAWER role
rbac grant --contract RBAC_ID --role WITHDRAWER --address GXXX... --network testnet

# 5. Test withdrawal
soroban contract invoke --id VAULT_ID --network testnet -- withdraw --account GXXX... --amount 1000
```

## Key Patterns

**Cross-Contract Authorization:**
```rust
let has_role = rbac_client.has_role(&WITHDRAWER_ROLE, &account);
if !has_role { panic!("Not authorized"); }
```

**Benefits:**
- Vault doesn't manage permissions (single source of truth)
- Permissions revocable without upgrading vault
- Audit trail via RBAC events

## See Also

[RBAC Contract](../../rbac/README.md) | [CLI](../../cli/README.md) | [SDK](../../js-sdk/README.md)
