# Security Policy

## Security Considerations

**Core Principles:**
- RBAC contract enforces authorization on-chain
- No admin key required for role-based automation
- Events emitted for all state changes (full audit trail)
- Indexer is read-only and can be rebuilt from chain data
- SDK/CLI/Frontend are UX tools, not security boundaries

**Trust Model:**
- **Trusted:** On-chain RBAC contract (single source of truth)
- **Untrusted:** All off-chain components (convenience only)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for trust boundaries and data flow.

## Threat Model

### In Scope

1. **Role Bypass**: Attempts to access protected functions without proper role
2. **Expiry Bypass**: Attempts to use expired role grants
3. **Admin Escalation**: Attempts to modify roles without admin permissions
4. **Event Manipulation**: Attempts to forge or suppress events

### Out of Scope

1. **Key Compromise**: Security of private keys is user responsibility
2. **Network Attacks**: Stellar network security guarantees apply
3. **Off-chain Components**: Frontend/indexer vulnerabilities (defense in depth only)

## Security Design

### Smart Contract

The RBAC contract implements the following security measures:

#### Authorization

- All state-modifying functions check caller authorization via `require_auth()`
- Role hierarchy is enforced: only admin role holders can grant/revoke
- The DEFAULT_ADMIN_ROLE is self-administeredand can grant any role

#### Time-based Expiry

- Expiry is checked using `env.ledger().timestamp()`
- Expired grants return `false` and emit `RoleExpired` events
- No cleanup is required; expiry is checked on access

#### Events

- All state changes emit events for off-chain indexing
- Events cannot be suppressed or forged
- Event topics use abbreviated names to save ledger space

### Key Management

#### Recommendations

1. **Use Hardware Wallets**: Store admin keys on hardware devices
2. **Multisig for Production**: Consider multisig for DEFAULT_ADMIN_ROLE
3. **Rotate Keys**: Implement key rotation procedures
4. **Principle of Least Privilege**: Grant minimal necessary roles

#### Environment Variables

Never commit secrets to version control. Use environment variables:

```bash
# Good - use environment variable name
rbac grant --key-env SIGNER_KEY ...

# Bad - never put keys in commands
rbac grant --key SXXX... ...  # DO NOT DO THIS
```

### Lint Checks

The CLI includes security lint checks:

```bash
rbac lint --contract <ID> --rpc <URL>
```

Checks include:

| Check | Severity | Description |
|-------|----------|-------------|
| `default_admin_held_by_deployer` | WARN | Admin may need rotation |
| `roles_without_admin` | WARN | Orphaned roles |
| `temporary_roles_without_expiry` | WARN | Missing expiry on temp roles |
| `expired_roles_present` | INFO | Cleanup suggestion |

## Vulnerability Disclosure

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email security@stellar-keystone.io with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
3. Allow 90 days for patch before public disclosure

## Audits

This contract has not yet been audited. Use at your own risk on mainnet.

Planned audits:
- [ ] Internal code review (Q1 2026)
- [ ] Third-party audit (Q2 2026)

## Known Limitations

1. **On-chain Enumeration**: Listing all role members on-chain is expensive. Use the indexer for queries.

2. **No Role Deletion**: Once created, roles cannot be deleted, only left unused.

3. **Single Admin Role**: Each role has exactly one admin role (role hierarchy is a tree, not a DAG).

4. **Expiry Precision**: Expiry uses ledger timestamps, which have ~5 second precision.

## Security Checklist

Before production deployment:

- [ ] Review all role definitions and admin assignments
- [ ] Verify DEFAULT_ADMIN_ROLE holders
- [ ] Set up event monitoring/alerting
- [ ] Document key management procedures
- [ ] Plan for key rotation
- [ ] Consider multisig for admin accounts
- [ ] Run lint checks: `rbac lint --contract <ID>`
- [ ] Test role expiry behavior
- [ ] Review integration code for proper error handling
