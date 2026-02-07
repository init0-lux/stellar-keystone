#!/bin/bash
# Stellar Keystone Cleanup Script
#
# Removes build artifacts, databases, and temporary files.
# Useful for clean rebuilds and before committing.

set -e

echo "=========================================="
echo "  Stellar Keystone Cleanup"
echo "=========================================="
echo

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Confirm cleanup
echo -e "${YELLOW}This will remove:${NC}"
echo "  • Build artifacts (target/, dist/, .next/)"
echo "  • Node modules (node_modules/)"
echo "  • Database files (*.db)"
echo "  • Lock files (Cargo.lock, package-lock.json)"
echo
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo

# Clean Rust artifacts
echo "Cleaning Rust artifacts..."
rm -rf rbac/target
rm -rf examples/secure_vault/target
rm -f rbac/Cargo.lock
rm -f examples/secure_vault/Cargo.lock
echo -e "${GREEN}✓ Rust artifacts cleaned${NC}"

# Clean JS SDK
echo "Cleaning JS SDK..."
rm -rf js-sdk/node_modules
rm -rf js-sdk/dist
rm -f js-sdk/package-lock.json
echo -e "${GREEN}✓ JS SDK cleaned${NC}"

# Clean CLI
echo "Cleaning CLI..."
rm -rf cli/node_modules
rm -rf cli/dist
rm -f cli/package-lock.json
echo -e "${GREEN}✓ CLI cleaned${NC}"

# Clean Indexer
echo "Cleaning Indexer..."
rm -rf indexer/node_modules
rm -rf indexer/dist
rm -f indexer/package-lock.json
rm -f indexer/*.db
rm -f *.db
echo -e "${GREEN}✓ Indexer cleaned${NC}"

# Clean Frontend
echo "Cleaning Frontend..."
rm -rf frontend/node_modules
rm -rf frontend/.next
rm -rf frontend/out
rm -f frontend/package-lock.json
echo -e "${GREEN}✓ Frontend cleaned${NC}"

# Clean temporary files
echo "Cleaning temporary files..."
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "*.swp" -type f -delete 2>/dev/null || true
echo -e "${GREEN}✓ Temporary files cleaned${NC}"

echo
echo "=========================================="
echo -e "${GREEN}  Cleanup Complete!${NC}"
echo "=========================================="
echo
echo "To rebuild:"
echo "  cd rbac && cargo build --release"
echo "  cd js-sdk && npm install && npm run build"
echo "  cd cli && npm install && npm run build"
echo "  cd indexer && npm install && npm run build"
echo "  cd frontend && npm install && npm run build"
echo
