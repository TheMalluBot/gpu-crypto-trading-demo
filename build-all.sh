#!/bin/bash

# GPU Crypto Trader Pro - Cross-Platform Build Script
# Builds for all supported platforms

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}============================================"
echo -e "GPU Crypto Trader Pro - Cross-Platform Build"
echo -e "============================================${NC}"
echo

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
fi

echo -e "${CYAN}Detected OS: $OS${NC}"
echo

# Function to build for current platform
build_current_platform() {
    case $OS in
        linux)
            echo -e "${YELLOW}Building for Linux...${NC}"
            chmod +x build-linux.sh
            ./build-linux.sh --release --target all
            ;;
        windows)
            echo -e "${YELLOW}Building for Windows...${NC}"
            powershell -ExecutionPolicy Bypass -File build-windows.ps1 -BuildType release -Target all
            ;;
        macos)
            echo -e "${YELLOW}Building for macOS...${NC}"
            chmod +x build-macos.sh
            ./build-macos.sh --release --target all
            ;;
        *)
            echo -e "${RED}Unsupported OS: $OS${NC}"
            exit 1
            ;;
    esac
}

# Function to create release directory
create_release_dir() {
    RELEASE_DIR="releases/v$(grep '"version"' package.json | cut -d '"' -f 4)"
    mkdir -p "$RELEASE_DIR"
    echo -e "${CYAN}Release directory: $RELEASE_DIR${NC}"
    echo "$RELEASE_DIR"
}

# Main build process
echo -e "${YELLOW}Starting build process...${NC}"
echo

# Clean old releases
if [ -d "releases" ]; then
    echo -e "${YELLOW}Cleaning old releases...${NC}"
    rm -rf releases
fi

# Create release directory
RELEASE_DIR=$(create_release_dir)

# Build for current platform
build_current_platform

# Copy artifacts to release directory
echo
echo -e "${YELLOW}Copying artifacts to release directory...${NC}"

case $OS in
    linux)
        # Copy Linux artifacts
        if [ -d "src-tauri/target/release/bundle" ]; then
            cp src-tauri/target/release/bundle/appimage/*.AppImage "$RELEASE_DIR/" 2>/dev/null || true
            cp src-tauri/target/release/bundle/deb/*.deb "$RELEASE_DIR/" 2>/dev/null || true
            cp src-tauri/target/release/bundle/rpm/*.rpm "$RELEASE_DIR/" 2>/dev/null || true
        fi
        if [ -f "GPU-Crypto-Trader-Pro-Portable-Linux.tar.gz" ]; then
            cp GPU-Crypto-Trader-Pro-Portable-Linux.tar.gz "$RELEASE_DIR/"
        fi
        ;;
    windows)
        # Copy Windows artifacts
        if [ -d "src-tauri/target/release/bundle" ]; then
            cp src-tauri/target/release/bundle/msi/*.msi "$RELEASE_DIR/" 2>/dev/null || true
            cp src-tauri/target/release/bundle/nsis/*.exe "$RELEASE_DIR/" 2>/dev/null || true
        fi
        if [ -f "GPU-Crypto-Trader-Pro-Portable-Windows.zip" ]; then
            cp GPU-Crypto-Trader-Pro-Portable-Windows.zip "$RELEASE_DIR/"
        fi
        ;;
    macos)
        # Copy macOS artifacts
        if [ -d "src-tauri/target/release/bundle" ]; then
            cp -r src-tauri/target/release/bundle/macos/*.app "$RELEASE_DIR/" 2>/dev/null || true
            cp src-tauri/target/release/bundle/dmg/*.dmg "$RELEASE_DIR/" 2>/dev/null || true
        fi
        ;;
esac

# Generate checksums
echo
echo -e "${YELLOW}Generating checksums...${NC}"
cd "$RELEASE_DIR"
sha256sum * > SHA256SUMS 2>/dev/null || shasum -a 256 * > SHA256SUMS
cd - > /dev/null

# Create release notes
echo
echo -e "${YELLOW}Creating release notes...${NC}"
cat > "$RELEASE_DIR/RELEASE_NOTES.md" << EOF
# GPU Crypto Trader Pro - Release Notes

## Version $(grep '"version"' package.json | cut -d '"' -f 4)

### Features
- GPU-accelerated trading algorithms
- Multi-token portfolio management
- Indian tax compliance (TDS, STCG, LTCG)
- Binance fee optimization
- AI-powered trading strategies
- Advanced analytics dashboard
- Real-time profit maintenance
- Auto-rebalancing system

### System Requirements

#### Windows
- Windows 10/11 (64-bit)
- 4GB RAM minimum (8GB recommended)
- NVIDIA GPU with CUDA support (optional)
- DirectX 12 compatible GPU (optional)

#### Linux
- Ubuntu 20.04+ / Debian 11+ / Fedora 34+ / Arch Linux
- 4GB RAM minimum (8GB recommended)
- WebKitGTK 4.1
- NVIDIA GPU with CUDA support (optional)
- Vulkan compatible GPU (optional)

#### macOS
- macOS 10.15 (Catalina) or later
- 4GB RAM minimum (8GB recommended)
- Metal compatible GPU

### Installation

See platform-specific instructions in the main README.

### Checksums

Verify file integrity using SHA256SUMS file.

EOF

echo -e "${GREEN}✓ Release notes created${NC}"

# Display summary
echo
echo -e "${GREEN}========================================"
echo -e "✓ Build completed successfully!"
echo -e "========================================${NC}"
echo
echo -e "${CYAN}Release artifacts:${NC}"
ls -lh "$RELEASE_DIR" | grep -v "^total"
echo
echo -e "${YELLOW}Release location: $RELEASE_DIR${NC}"
echo
echo -e "${GREEN}Next steps:${NC}"
echo "1. Test the builds on target platforms"
echo "2. Create GitHub release with these artifacts"
echo "3. Upload to distribution platforms"
echo
echo -e "${GREEN}Build complete! 🚀${NC}"