# Stellar Keystone Scripts

Utility scripts for demos and development.

## demo.sh

Runs a full RBAC demo on testnet or local network.

**What it does:**
- Checks prerequisites (Node.js, WASM, Stellar CLI)
- Builds contract if needed
- Deploys contract
- Creates roles
- Grants and revokes permissions

**Usage:**
```bash
export DEMO_SIGNER_KEY=SXXX...
./scripts/demo.sh testnet
```

For local network, the script generates a temporary key automatically.

## demo.ts

TypeScript implementation of the demo workflow.

**Features:**
- Real contract deployment via SDK
- Role creation and grants
- Error handling examples
- Network interaction patterns

**Direct usage:**
```bash
export DEMO_SIGNER_KEY=SXXX...
npx tsx scripts/demo.ts testnet
```

## cleanup.sh

Resets demo state and artifacts.

**Usage:**
```bash
./scripts/cleanup.sh
```

## CI/CD Integration

These scripts can be used in CI pipelines for integration testing:

```yaml
# Example GitHub Actions
- name: Run RBAC Demo
  env:
    DEMO_SIGNER_KEY: ${{ secrets.TESTNET_KEY }}
  run: ./scripts/demo.sh testnet
```

## License

MIT
