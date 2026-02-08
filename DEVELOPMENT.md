# Development Guide

This guide covers local development setup, testing, and contribution guidelines.

## Prerequisites

### Required Tools

- **Rust** 1.70+ with wasm32 target
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup target add wasm32-unknown-unknown
  ```

- **Node.js** 20+ and npm
  ```bash
  # Using nvm
  nvm install 20
  nvm use 20
  ```

- **Soroban CLI**
  ```bash
  cargo install soroban-cli
  ```

- **SQLite3**
  ```bash
  # Ubuntu/Debian
  sudo apt-get install sqlite3 libsqlite3-dev
  
  # macOS
  brew install sqlite3
  ```

## Local Development

### 1. Start Local Soroban Node

```bash
# Start a local Stellar network with Soroban support
soroban network add local --rpc-url http://127.0.0.1:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"

# Or use Docker
docker run -d -p 8000:8000 stellar/quickstart --local
```

### 2. Build the RBAC Contract

```bash
cd rbac
cargo build --release --target wasm32-unknown-unknown

# Run tests
cargo test
```

### 3. Deploy to Local Network

```bash
# Create a test identity
soroban keys generate demo --network local

# Get the public key
export DEMO_ADDR=$(soroban keys address demo)

# Deploy the contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rbac.wasm \
  --source demo \
  --network local
```

### 4. Set Up JS Components

```bash
# Install SDK dependencies
cd js-sdk && npm install

# Install CLI
cd ../cli && npm install && npm link

# Install indexer
cd ../indexer && npm install

# Install frontend
cd ../frontend && npm install
```

### 5. Run the Full Stack

```bash
# Terminal 1: Start the indexer
cd indexer
npm start -- --rpc http://127.0.0.1:8000/soroban/rpc --contract <CONTRACT_ID>

# Terminal 2: Start the frontend
cd frontend
npm run dev

# Open http://localhost:3000
```

## Testing

### Rust Contract Tests

```bash
cd rbac
cargo test

# With coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### JavaScript SDK Tests

```bash
cd js-sdk
npm test

# With coverage
npm run test:coverage
```

### CLI Tests

```bash
cd cli
npm test
```

### Integration Tests

```bash
# Run the demo script
./scripts/demo.sh

# This will deploy, create roles, grant, and verify
```

## Code Style

### Rust

We use `rustfmt` for formatting:

```bash
cargo fmt --all

# Check formatting
cargo fmt --all -- --check
```

We use `clippy` for linting:

```bash
cargo clippy --all-targets -- -D warnings
```

### TypeScript

We use Prettier and ESLint:

```bash
# Format
npm run format

# Lint
npm run lint
```

## Project Structure

```
stellar-keystone/
├── rbac/                     # Soroban RBAC contract
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs            # Main contract implementation
│
├── examples/
│   └── secure_vault/         # Example contract consuming RBAC
│       ├── Cargo.toml
│       └── src/lib.rs
│
├── js-sdk/                   # TypeScript SDK
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Main exports
│       ├── index.test.ts     # Tests
│       ├── errors.ts         # Custom error types
│       ├── event-schemas.ts  # Event type mappings
│       ├── retry.ts          # Retry utilities
│       └── admin-safety.ts   # Admin role safety checks
│
├── cli/                      # Command-line interface
│   ├── package.json
│   └── src/
│       └── index.ts          # CLI commands
│
├── indexer/                  # Event indexer
│   ├── package.json
│   └── src/
│       ├── index.ts          # Main indexer
│       └── query.ts          # Query utilities
│
├── frontend/                 # Next.js admin UI
│   ├── package.json
│   └── app/
│       ├── page.tsx          # Dashboard
│       ├── roles/            # Role management
│       └── deploy/           # Deployment wizard
│
├── scripts/                  # Utility scripts
│   ├── demo.sh
│   └── cleanup.sh
│
└── docs/                     # Additional documentation
```

## Contributing

### Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test` and `cargo test`
5. Run linters: `npm run lint` and `cargo clippy`
6. Commit with conventional commits: `feat: add new feature`
7. Push and create a Pull Request

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes before requesting review

## Troubleshooting

### Common Issues

**Contract build fails with missing target**
```bash
rustup target add wasm32-unknown-unknown
```

**Soroban CLI not found**
```bash
# Ensure ~/.cargo/bin is in PATH
export PATH="$HOME/.cargo/bin:$PATH"
```

**SQLite module not found**
```bash
# Install native dependencies
npm rebuild better-sqlite3
```

**Frontend fails to fetch data**
- Check that INDEXER_DB_PATH points to a valid database
- Ensure the indexer has run at least once

## Release Process

1. Update version in all `package.json` and `Cargo.toml` files
2. Update CHANGELOG.md
3. Create a git tag: `git tag v1.0.0`
4. Push: `git push origin v1.0.0`
5. CI will build and publish packages
