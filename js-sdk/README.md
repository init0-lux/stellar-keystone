# @stellar-keystone/sdk

JavaScript SDK for interacting with Stellar Keystone RBAC (Role-Based Access Control) contracts on the Soroban network.

## Installation

```bash
npm install @stellar-keystone/sdk
```

## Quick Start

```typescript
import {
  deployRbac,
  grantRole,
  hasRole,
  configureSDK,
} from '@stellar-keystone/sdk';

// Optional: Configure SDK with a read-only account for reliable simulations
configureSDK({
  readOnlyAccount: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
});

// Deploy RBAC contract
const { contractId } = await deployRbac('testnet', process.env.SIGNER_KEY!);

// Grant a role
await grantRole(contractId, 'WITHDRAWER', accountAddress, undefined, signerKey);

// Check role (with proper error handling)
try {
  const hasWithdrawer = await hasRole(contractId, 'WITHDRAWER', accountAddress);
  if (hasWithdrawer) {
    console.log('Account can withdraw');
  }
} catch (error) {
  if (error instanceof RoleCheckError) {
    console.error('Network error - could not verify role');
  }
}
```

## API Reference

### Configuration

#### `configureSDK(config)`
Configure SDK-level defaults.

```typescript
configureSDK({
  readOnlyAccount: 'GXXX...',  // Funded account for simulation
});
```

### Contract Operations

#### `deployRbac(network, signerKey)`
Deploy a new RBAC contract.

#### `createRole(contractId, role, adminRole, signerKey, network?)`
Create a new role with specified admin.

#### `grantRole(contractId, role, account, expiryIso?, signerKey, network?)`
Grant a role to an account. Expiry is optional ISO8601 string.

#### `revokeRole(contractId, role, account, signerKey, network?)`
Revoke a role from an account.

### Role Checking

#### `hasRole(contractId, role, account, networkOrOptions?)`
Check if an account has a role. **Throws `RoleCheckError` on network failures.**

```typescript
// Simple usage
const has = await hasRole(contractId, 'ADMIN', account);

// With options
const has = await hasRole(contractId, 'ADMIN', account, {
  network: 'testnet',
  readOnlyAccount: 'GXXX...',
});
```

#### `assertRoleClientSide(contractId, role, account, networkOrOptions?)`
Assert role exists or throw. **This is a client-side check only.**

### Events

#### `watchRoleEvents(contractId, callback, network?, pollInterval?)`
Watch for role events from the contract.

## Security Considerations

> ⚠️ **This SDK is security-adjacent, not security-enforcing.**

### What the SDK does:
- Requires signatures for all mutations
- Leaves authorization enforcement to the on-chain contract
- Provides convenient role checking for UX purposes

### What the SDK does NOT do:
- Enforce authorization off-chain
- Guarantee role check results are authoritative (network can fail)
- Replace on-chain security checks

### Best Practices:

1. **Never use `hasRole()` or `assertRoleClientSide()` as your only security gate**
   - These are for UX hints (hiding buttons, showing/hiding UI)
   - The contract always has the final say

2. **Always handle `RoleCheckError`**
   - Network failures throw errors, not return `false`
   - A transport error ≠ user lacks permission

3. **Configure a `readOnlyAccount` for reliable simulations**
   - Random simulated accounts may fail in edge cases

4. **Treat client-side role checks as UX hints, not security boundaries**

## Error Handling

The SDK provides typed errors for different failure modes:

```typescript
import { RoleCheckError, SimulationError, TransactionError } from '@stellar-keystone/sdk';

try {
  const has = await hasRole(contractId, 'ADMIN', account);
} catch (error) {
  if (error instanceof RoleCheckError) {
    if (error.isTransportError) {
      // Network failure - retry or show error
    } else {
      // Simulation failed - contract issue
    }
  }
}
```

## Event Schema

The SDK exports canonical event type constants matching the Rust contract:

```typescript
import { EVENT_TYPES, EVENT_TYPE_MAP, RBAC_SDK_VERSION } from '@stellar-keystone/sdk';

// Truncated Rust symbol names
EVENT_TYPES.ROLE_CREATED  // 'RoleCreat'
EVENT_TYPES.ROLE_GRANTED  // 'RoleGrant'

// Human-readable mapping
EVENT_TYPE_MAP['RoleCreat']  // 'RoleCreated'
```

## Migration Guide

### v1.0.0 Breaking Changes

1. **`requireRoleOrThrow` renamed to `assertRoleClientSide`**
   - The old function still works but logs a deprecation warning
   - Will be removed in v2

2. **`hasRole` now throws on network errors**
   - Previously returned `false` on any failure (dangerous!)
   - Now throws `RoleCheckError` for transport/simulation failures
   - Only returns `false` for actual "no permission" result

## Development

```bash
# Build
npm run build

# Test
npm test

# Integration tests (requires Soroban node)
TEST_INTEGRATION=true npm test
```

## License

MIT
