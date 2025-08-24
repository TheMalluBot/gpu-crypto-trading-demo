#!/bin/bash

# GPU Crypto Trader Pro - Linux Build Script
# Bash script for building Linux releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BUILD_TYPE="release"
TARGET="all"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --debug) BUILD_TYPE="debug" ;;
        --release) BUILD_TYPE="release" ;;
        --target) TARGET="$2"; shift ;;
        --help) 
            echo "Usage: ./build-linux.sh [options]"
            echo "Options:"
            echo "  --debug      Build in debug mode"
            echo "  --release    Build in release mode (default)"
            echo "  --target     Build target: appimage, deb, rpm, all (default: all)"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${CYAN}========================================"
echo -e "GPU Crypto Trader Pro - Linux Builder"
echo -e "========================================${NC}"
echo

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js is not installed!${NC}"
    echo -e "${YELLOW}  Please install Node.js:${NC}"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Fedora: sudo dnf install nodejs npm"
    echo "  Arch: sudo pacman -S nodejs npm"
    exit 1
fi

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo -e "${GREEN}✓ Rust version: $RUST_VERSION${NC}"
else
    echo -e "${RED}✗ Rust is not installed!${NC}"
    echo -e "${YELLOW}  Please install Rust from https://rustup.rs/${NC}"
    exit 1
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version)
    echo -e "${GREEN}✓ Cargo version: $CARGO_VERSION${NC}"
else
    echo -e "${RED}✗ Cargo is not installed!${NC}"
    exit 1
fi

# Check for system dependencies
echo -e "${YELLOW}Checking system dependencies...${NC}"

# Function to check if a package is installed
check_package() {
    if dpkg -l | grep -q "^ii.*$1"; then
        return 0
    elif rpm -qa | grep -q "$1"; then
        return 0
    elif pacman -Q "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check required libraries
MISSING_DEPS=""

# WebKitGTK
if ! check_package "webkit2gtk" && ! check_package "webkit2gtk-4.1" && ! check_package "libwebkit2gtk"; then
    MISSING_DEPS="$MISSING_DEPS webkit2gtk"
fi

# OpenSSL
if ! check_package "openssl" && ! check_package "libssl"; then
    MISSING_DEPS="$MISSING_DEPS openssl"
fi

# Build essentials
if ! command -v gcc &> /dev/null; then
    MISSING_DEPS="$MISSING_DEPS build-essential"
fi

# pkg-config
if ! command -v pkg-config &> /dev/null; then
    MISSING_DEPS="$MISSING_DEPS pkg-config"
fi

if [ -n "$MISSING_DEPS" ]; then
    echo -e "${YELLOW}⚠ Missing system dependencies:${NC}"
    echo "  $MISSING_DEPS"
    echo
    echo "Install them with:"
    
    # Detect distribution
    if [ -f /etc/debian_version ]; then
        echo "  sudo apt update"
        echo "  sudo apt install libwebkit2gtk-4.1-dev libssl-dev build-essential pkg-config"
    elif [ -f /etc/fedora-release ]; then
        echo "  sudo dnf install webkit2gtk3-devel openssl-devel gcc pkg-config"
    elif [ -f /etc/arch-release ]; then
        echo "  sudo pacman -S webkit2gtk openssl base-devel pkg-config"
    fi
    echo
fi

# Check for CUDA (optional)
if [ -n "$CUDA_PATH" ] || [ -d "/usr/local/cuda" ]; then
    echo -e "${GREEN}✓ CUDA found${NC}"
    export CUDA_AVAILABLE=1
else
    echo -e "${YELLOW}⚠ CUDA not found (GPU features may be limited)${NC}"
    export CUDA_AVAILABLE=0
fi

# Check for Vulkan (optional)
if command -v vulkaninfo &> /dev/null; then
    echo -e "${GREEN}✓ Vulkan found${NC}"
    export VULKAN_AVAILABLE=1
else
    echo -e "${YELLOW}⚠ Vulkan not found (GPU features may be limited)${NC}"
    export VULKAN_AVAILABLE=0
fi

echo
echo -e "${YELLOW}Installing dependencies...${NC}"

# Install Node dependencies
echo -e "${CYAN}Installing Node.js dependencies...${NC}"
npm ci
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install Node dependencies${NC}"
    exit 1
fi

# Install Rust dependencies
echo -e "${CYAN}Installing Rust dependencies...${NC}"
cd src-tauri
cargo fetch
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to fetch Rust dependencies${NC}"
    exit 1
fi
cd ..

# Install Tauri CLI if not present
echo -e "${CYAN}Checking Tauri CLI...${NC}"
if cargo tauri --version &> /dev/null; then
    TAURI_VERSION=$(cargo tauri --version)
    echo -e "${GREEN}✓ Tauri CLI version: $TAURI_VERSION${NC}"
else
    echo -e "${YELLOW}Installing Tauri CLI...${NC}"
    cargo install tauri-cli
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install Tauri CLI${NC}"
        exit 1
    fi
fi

echo
echo -e "${YELLOW}Building application...${NC}"

# Clean previous builds
echo -e "${CYAN}Cleaning previous builds...${NC}"
rm -rf dist
rm -rf src-tauri/target/release/bundle

# Build frontend
echo -e "${CYAN}Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Set build arguments
BUILD_ARGS=""
if [ "$BUILD_TYPE" = "release" ]; then
    BUILD_ARGS="--release"
fi

# Set target-specific arguments
case $TARGET in
    appimage)
        BUILD_ARGS="$BUILD_ARGS --bundles appimage"
        ;;
    deb)
        BUILD_ARGS="$BUILD_ARGS --bundles deb"
        ;;
    rpm)
        BUILD_ARGS="$BUILD_ARGS --bundles rpm"
        ;;
    all)
        # Build all targets
        ;;
    *)
        echo -e "${RED}Invalid target: $TARGET${NC}"
        exit 1
        ;;
esac

# Build Tauri application
echo -e "${CYAN}Building Tauri application...${NC}"
echo "Build type: $BUILD_TYPE"
echo "Target: $TARGET"

cargo tauri build $BUILD_ARGS
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Tauri build failed${NC}"
    exit 1
fi

echo
echo -e "${GREEN}========================================"
echo -e "✓ Build completed successfully!"
echo -e "========================================${NC}"
echo

# List output files
BUNDLE_PATH="src-tauri/target/release/bundle"
if [ -d "$BUNDLE_PATH" ]; then
    echo -e "${CYAN}Build artifacts:${NC}"
    
    # Check for AppImage
    if [ -d "$BUNDLE_PATH/appimage" ]; then
        for file in $BUNDLE_PATH/appimage/*.AppImage; do
            if [ -f "$file" ]; then
                SIZE=$(du -h "$file" | cut -f1)
                echo -e "  AppImage: $(basename $file)"
                echo -e "           Size: $SIZE"
            fi
        done
    fi
    
    # Check for DEB
    if [ -d "$BUNDLE_PATH/deb" ]; then
        for file in $BUNDLE_PATH/deb/*.deb; do
            if [ -f "$file" ]; then
                SIZE=$(du -h "$file" | cut -f1)
                echo -e "  DEB: $(basename $file)"
                echo -e "       Size: $SIZE"
            fi
        done
    fi
    
    # Check for RPM
    if [ -d "$BUNDLE_PATH/rpm" ]; then
        for file in $BUNDLE_PATH/rpm/*.rpm; do
            if [ -f "$file" ]; then
                SIZE=$(du -h "$file" | cut -f1)
                echo -e "  RPM: $(basename $file)"
                echo -e "       Size: $SIZE"
            fi
        done
    fi
    
    echo
    echo -e "${YELLOW}Packages location: $BUNDLE_PATH${NC}"
fi

# Create portable tarball
if [ "$TARGET" = "all" ] || [ "$TARGET" = "portable" ]; then
    echo
    echo -e "${CYAN}Creating portable tarball...${NC}"
    
    PORTABLE_DIR="dist-portable"
    rm -rf $PORTABLE_DIR
    mkdir -p $PORTABLE_DIR
    
    # Copy executable
    EXE_PATH="src-tauri/target/release/gpu-crypto-trader-pro"
    if [ -f "$EXE_PATH" ]; then
        cp $EXE_PATH $PORTABLE_DIR/
        
        # Create launch script
        cat > $PORTABLE_DIR/launch.sh << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export LD_LIBRARY_PATH="$SCRIPT_DIR/lib:$LD_LIBRARY_PATH"
"$SCRIPT_DIR/gpu-crypto-trader-pro" "$@"
EOF
        chmod +x $PORTABLE_DIR/launch.sh
        
        # Create portable config
        cat > $PORTABLE_DIR/portable.json << EOF
{
  "portable": true,
  "dataDir": "./data",
  "configDir": "./config"
}
EOF
        
        # Create tarball
        TAR_NAME="GPU-Crypto-Trader-Pro-Portable-Linux.tar.gz"
        tar -czf $TAR_NAME -C $PORTABLE_DIR .
        
        SIZE=$(du -h $TAR_NAME | cut -f1)
        echo -e "${GREEN}✓ Portable tarball created: $TAR_NAME${NC}"
        echo -e "  Size: $SIZE"
    fi
fi

echo
echo -e "${GREEN}Build complete! 🚀${NC}"

# Provide installation instructions
echo
echo -e "${CYAN}Installation instructions:${NC}"
echo
echo "AppImage:"
echo "  chmod +x GPU-Crypto-Trader-Pro_*.AppImage"
echo "  ./GPU-Crypto-Trader-Pro_*.AppImage"
echo
echo "DEB (Ubuntu/Debian):"
echo "  sudo dpkg -i gpu-crypto-trader-pro_*.deb"
echo "  sudo apt -f install  # Fix dependencies if needed"
echo
echo "RPM (Fedora/RHEL):"
echo "  sudo rpm -i gpu-crypto-trader-pro-*.rpm"
echo "  # or"
echo "  sudo dnf install ./gpu-crypto-trader-pro-*.rpm"
echo
echo "Portable:"
echo "  tar -xzf GPU-Crypto-Trader-Pro-Portable-Linux.tar.gz"
echo "  ./launch.sh"