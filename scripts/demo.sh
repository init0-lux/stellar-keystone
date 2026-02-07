#!/bin/bash
# Stellar Keystone RBAC Demo Script
# 
# This is a thin launcher that checks prerequisites and runs the TypeScript demo.

set -e

echo "=========================================="
echo "  Stellar Keystone RBAC Demo"
echo "  Complete Feature Demonstration"
echo "=========================================="
echo

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}▶ Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}  ⚠️  Node.js not found${NC}"
    echo "  Please install Node.js 20+ to run this demo"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}  ⚠️  Node.js version too old: $(node --version)${NC}"
    echo "  Please upgrade to Node.js 20+"
    exit 1
fi

echo -e "${GREEN}  ✓ Node.js found: $(node --version)${NC}"

# Check if contract WASM exists
if [ ! -f "rbac/target/wasm32-unknown-unknown/release/stellar_keystone_rbac.wasm" ]; then
    echo -e "${YELLOW}  ⚠️  RBAC contract WASM not found${NC}"
    echo "  Building contract..."
    
    if ! command -v cargo &> /dev/null; then
        echo "  Error: Rust/Cargo not installed"
        echo "  Install from: https://rustup.rs"
        exit 1
    fi
    
    cd rbac
    cargo build --target wasm32-unknown-unknown --release
    cd ..
    echo -e "${GREEN}  ✓ Contract built${NC}"
else
    echo -e "${GREEN}  ✓ Contract WASM found${NC}"
fi

# Get network from arguments
NETWORK="${1:-testnet}"

if [ "$NETWORK" != "local" ] && [ "$NETWORK" != "testnet" ]; then
    echo -e "${YELLOW}Error: Invalid network \"$NETWORK\"${NC}"
    echo "Usage: $0 [local|testnet]"
    exit 1
fi

echo -e "${GREEN}  ✓ Network: $NETWORK${NC}"

# Check/generate signer key
if [ -z "$DEMO_SIGNER_KEY" ]; then
    echo -e "${YELLOW}  ⚠️  DEMO_SIGNER_KEY not set${NC}"
    
    if [ "$NETWORK" = "local" ]; then
        echo "  Generating temporary key for local network..."
        
        if ! command -v stellar &> /dev/null; then
            echo "  Error: Stellar CLI not installed"
            echo "  Install from: https://developers.stellar.org/docs/tools/developer-tools"
            exit 1
        fi
        
        # Generate temporary keypair
        DEMO_SIGNER_KEY=$(stellar keys generate demo --network standalone 2>&1 | grep -oP 'Secret key: \K.*' || echo "")
        
        if [ -z "$DEMO_SIGNER_KEY" ]; then
            echo "  Error: Failed to generate key"
            exit 1
        fi
        
        export DEMO_SIGNER_KEY
        echo -e "${GREEN}  ✓ Generated temporary key${NC}"
    else
        echo "  Error: DEMO_SIGNER_KEY required for testnet"
        echo "  Please set the environment variable:"
        echo "    export DEMO_SIGNER_KEY=SXXX..."
        echo ""
        echo "  Get a funded testnet account at:"
        echo "    https://laboratory.stellar.org/#account-creator?network=test"
        exit 1
    fi
else
    echo -e "${GREEN}  ✓ DEMO_SIGNER_KEY found${NC}"
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"
echo

# Install dependencies if needed
if [ ! -d "js-sdk/node_modules" ]; then
    echo -e "${BLUE}▶ Installing SDK dependencies...${NC}"
    cd js-sdk && npm install && cd ..
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo
fi

# Build SDK if needed
if [ ! -d "js-sdk/dist" ]; then
    echo -e "${BLUE}▶ Building SDK...${NC}"
    cd js-sdk && npm run build && cd ..
    echo -e "${GREEN}✓ SDK built${NC}"
    echo
fi

# Run the demo
echo -e "${BLUE}▶ Running demo on $NETWORK...${NC}"
echo

npx tsx scripts/demo.ts "$NETWORK"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo
    echo -e "${GREEN}Demo completed successfully!${NC}"
else
    echo
    echo -e "${YELLOW}Demo exited with code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
