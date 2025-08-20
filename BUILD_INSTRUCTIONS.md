# GPU Crypto Trader Pro - Build Instructions

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Windows Build](#windows-build)
- [Linux Build](#linux-build)
- [macOS Build](#macos-build)
- [Cross-Platform Build](#cross-platform-build)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### All Platforms
- **Node.js** 18.x or later
- **Rust** 1.70.0 or later
- **Git**
- 8GB RAM (minimum)
- 10GB free disk space

### Platform-Specific Requirements

#### Windows
- Windows 10/11 (64-bit)
- Visual Studio 2022 or Build Tools for Visual Studio 2022
- Windows SDK
- WebView2 (auto-installed)
- **Optional**: CUDA Toolkit 12.x for NVIDIA GPU support
- **Optional**: DirectX 12 SDK

#### Linux
- Ubuntu 20.04+, Debian 11+, Fedora 34+, or Arch Linux
- Development tools: `build-essential`, `pkg-config`
- Libraries: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`
- **Optional**: CUDA Toolkit 12.x for NVIDIA GPU support
- **Optional**: Vulkan SDK for GPU acceleration

#### macOS
- macOS 10.15 (Catalina) or later
- Xcode Command Line Tools
- **Optional**: Metal Performance Shaders for GPU acceleration

## 🪟 Windows Build

### Quick Build
```powershell
# Clone the repository
git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
cd gpu-crypto-trader-pro

# Install dependencies
npm install

# Build for Windows (all formats)
.\build-windows.ps1 -BuildType release -Target all
```

### Detailed Steps

1. **Install Prerequisites**
   ```powershell
   # Install Node.js (if not installed)
   winget install OpenJS.NodeJS
   
   # Install Rust (if not installed)
   # Download from https://rustup.rs/
   
   # Install Visual Studio Build Tools
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```

2. **Setup CUDA (Optional)**
   ```powershell
   # Download CUDA Toolkit from NVIDIA
   # https://developer.nvidia.com/cuda-downloads
   ```

3. **Clone and Setup**
   ```powershell
   git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
   cd gpu-crypto-trader-pro
   npm install
   ```

4. **Build Options**
   ```powershell
   # Debug build
   .\build-windows.ps1 -BuildType debug
   
   # Release build (optimized)
   .\build-windows.ps1 -BuildType release
   
   # Specific target
   .\build-windows.ps1 -Target msi      # MSI installer only
   .\build-windows.ps1 -Target nsis     # NSIS installer only
   .\build-windows.ps1 -Target portable # Portable ZIP only
   ```

5. **Output Location**
   - MSI: `src-tauri/target/release/bundle/msi/`
   - NSIS: `src-tauri/target/release/bundle/nsis/`
   - Portable: `GPU-Crypto-Trader-Pro-Portable-Windows.zip`

## 🐧 Linux Build

### Quick Build
```bash
# Clone the repository
git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
cd gpu-crypto-trader-pro

# Make build script executable
chmod +x build-linux.sh

# Build for Linux (all formats)
./build-linux.sh --release --target all
```

### Detailed Steps

1. **Install Prerequisites**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install -y \
     curl \
     wget \
     build-essential \
     pkg-config \
     libwebkit2gtk-4.1-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install nodejs
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   
   **Fedora:**
   ```bash
   sudo dnf install -y \
     gcc \
     gcc-c++ \
     pkg-config \
     webkit2gtk3-devel \
     openssl-devel \
     libappindicator-gtk3-devel \
     librsvg2-devel \
     nodejs \
     npm
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   
   **Arch Linux:**
   ```bash
   sudo pacman -S \
     base-devel \
     webkit2gtk \
     openssl \
     libappindicator-gtk3 \
     librsvg \
     nodejs \
     npm
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Setup CUDA (Optional)**
   ```bash
   # Ubuntu/Debian
   wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
   sudo dpkg -i cuda-keyring_1.1-1_all.deb
   sudo apt update
   sudo apt install cuda-toolkit-12-3
   ```

3. **Clone and Setup**
   ```bash
   git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
   cd gpu-crypto-trader-pro
   npm install
   ```

4. **Build Options**
   ```bash
   # Debug build
   ./build-linux.sh --debug
   
   # Release build (optimized)
   ./build-linux.sh --release
   
   # Specific target
   ./build-linux.sh --target appimage  # AppImage only
   ./build-linux.sh --target deb       # DEB package only
   ./build-linux.sh --target rpm       # RPM package only
   ```

5. **Output Location**
   - AppImage: `src-tauri/target/release/bundle/appimage/`
   - DEB: `src-tauri/target/release/bundle/deb/`
   - RPM: `src-tauri/target/release/bundle/rpm/`
   - Portable: `GPU-Crypto-Trader-Pro-Portable-Linux.tar.gz`

## 🍎 macOS Build

### Quick Build
```bash
# Clone the repository
git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
cd gpu-crypto-trader-pro

# Install dependencies
npm install

# Build for macOS
npm run tauri build
```

### Detailed Steps

1. **Install Prerequisites**
   ```bash
   # Install Xcode Command Line Tools
   xcode-select --install
   
   # Install Homebrew (if not installed)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Node.js
   brew install node
   
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Clone and Setup**
   ```bash
   git clone https://github.com/yourusername/gpu-crypto-trader-pro.git
   cd gpu-crypto-trader-pro
   npm install
   ```

3. **Build**
   ```bash
   # Intel Mac
   npm run tauri build -- --target x86_64-apple-darwin
   
   # Apple Silicon (M1/M2)
   npm run tauri build -- --target aarch64-apple-darwin
   
   # Universal (both architectures)
   npm run tauri build -- --target universal-apple-darwin
   ```

4. **Output Location**
   - DMG: `src-tauri/target/release/bundle/dmg/`
   - App: `src-tauri/target/release/bundle/macos/`

## 🌍 Cross-Platform Build

### Using the Universal Build Script
```bash
# Make script executable
chmod +x build-all.sh

# Build for current platform
./build-all.sh
```

This script will:
1. Detect your operating system
2. Run the appropriate build script
3. Create a release directory with all artifacts
4. Generate checksums for verification

## 🚀 CI/CD with GitHub Actions

### Automatic Builds on Release

1. **Create a new release tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build for Windows, Linux, and macOS
   - Create installers and packages
   - Generate checksums
   - Create a GitHub Release with all artifacts

### Required Secrets

Configure these in your GitHub repository settings:

- `TAURI_PRIVATE_KEY`: Tauri signing key
- `TAURI_KEY_PASSWORD`: Tauri signing key password

**For macOS (optional):**
- `APPLE_CERTIFICATE`: Apple Developer certificate
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_SIGNING_IDENTITY`: Signing identity
- `APPLE_ID`: Apple ID for notarization
- `APPLE_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

## 🔨 Manual Build Commands

### Frontend Only
```bash
npm run build
```

### Backend Only
```bash
cd src-tauri
cargo build --release
```

### Full Application
```bash
npm run tauri build
```

### Development Mode
```bash
npm run tauri dev
```

## 🐛 Troubleshooting

### Common Issues

#### Windows: "Visual Studio not found"
- Install Visual Studio 2022 Community with C++ workload
- Or install Build Tools for Visual Studio 2022

#### Linux: "webkit2gtk not found"
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk3-devel

# Arch
sudo pacman -S webkit2gtk
```

#### macOS: "Developer tools not found"
```bash
xcode-select --install
```

#### All Platforms: "Tauri CLI not found"
```bash
cargo install tauri-cli
```

### Build Optimization

#### Reduce Binary Size
```toml
# In Cargo.toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Single codegen unit
strip = true        # Strip symbols
panic = "abort"     # Smaller panic handler
```

#### Enable GPU Features
```toml
# In Cargo.toml
[features]
default = ["cuda", "vulkan", "directx12"]
cuda = []
vulkan = []
directx12 = []
```

## 📦 Distribution

### Windows
- **Microsoft Store**: Use the MSIX package
- **Website**: Provide MSI and NSIS installers
- **Portable**: ZIP file for USB/portable use

### Linux
- **Snap Store**: Convert AppImage to Snap
- **Flathub**: Create Flatpak package
- **AUR**: Submit to Arch User Repository
- **Website**: Provide AppImage, DEB, and RPM

### macOS
- **App Store**: Submit DMG for review
- **Website**: Provide notarized DMG

## 📄 License

This build system is part of GPU Crypto Trader Pro and is subject to the project's license terms.

## 🤝 Contributing

For build system improvements, please submit pull requests to the main repository.

## 📞 Support

For build issues, please open an issue on GitHub with:
- Operating system and version
- Build command used
- Complete error output
- System specifications