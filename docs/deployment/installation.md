# Installation Guide

**Version**: 1.0.0  
**Last Updated**: July 27, 2025  
**Target Platforms**: Windows, Linux, macOS

## 🎯 Overview

This guide provides step-by-step instructions for installing and configuring the Crypto Trading Application in a secure paper trading environment.

## ⚠️ Pre-Installation Security Notice

**IMPORTANT**: This application is designed for **PAPER TRADING ONLY**. It cannot and will not perform live trading with real money.

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, Ubuntu 20.04+, macOS 11+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free disk space
- **Network**: Internet connection for market data
- **GPU**: Optional, any DirectX 11/OpenGL 3.3 compatible

### Recommended Requirements
- **OS**: Windows 11, Ubuntu 22.04+, macOS 12+
- **RAM**: 16GB for optimal performance
- **Storage**: 5GB free disk space (SSD recommended)
- **GPU**: Dedicated GPU for enhanced particle rendering
- **Network**: Stable broadband connection

## 🔧 Installation Methods

### Method 1: Portable Executable (Recommended)

Download the pre-built portable version for quick setup:

1. **Download Latest Release**
   ```bash
   # Download from releases page
   wget https://github.com/your-repo/crypto-trader/releases/latest/crypto_trader_portable.zip
   ```

2. **Extract and Run**
   ```bash
   unzip crypto_trader_portable.zip
   cd crypto_trader_portable
   
   # Windows
   ./crypto_trader.exe
   
   # Linux
   ./crypto_trader_linux
   chmod +x crypto_trader_linux && ./crypto_trader_linux
   
   # macOS
   ./crypto_trader_macos
   ```

3. **Verify Installation**
   - Application window opens
   - "Paper Trading Mode" indicator visible
   - No error messages in console

### Method 2: Build from Source

For developers and advanced users:

#### Prerequisites

**Install Rust (Required)**
```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

**Install Node.js (Required)**
```bash
# Install Node.js 18+ and npm
# Windows: Download from nodejs.org
# macOS: brew install node
# Ubuntu: 
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Install Tauri CLI**
```bash
cargo install tauri-cli
```

**Additional Dependencies**

*Windows:*
```bash
# Install Visual Studio Build Tools or Visual Studio Community
# Download from: https://visualstudio.microsoft.com/downloads/

# Install WebView2 Runtime (usually pre-installed on Windows 11)
# Download from: https://developer.microsoft.com/microsoft-edge/webview2/
```

*Linux (Ubuntu/Debian):*
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

*macOS:*
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install additional dependencies with Homebrew
brew install gtk+3
```

#### Build Process

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-repo/crypto-trader.git
   cd crypto-trader
   ```

2. **Install Dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install Rust dependencies (automatically handled by Cargo)
   cd src-tauri
   cargo check
   cd ..
   ```

3. **Build Application**
   ```bash
   # Development build
   npm run tauri dev
   
   # Production build
   npm run tauri build
   ```

4. **Locate Built Application**
   ```bash
   # Built application location:
   # Windows: src-tauri/target/release/crypto_trader.exe
   # Linux: src-tauri/target/release/crypto_trader
   # macOS: src-tauri/target/release/bundle/macos/crypto_trader.app
   ```

## 🔐 Security Configuration

### Initial Security Setup

1. **Verify Paper Trading Mode**
   - Launch application
   - Check for "Paper Trading" indicators in UI
   - Verify testnet URLs in network traffic

2. **Configure Secure Storage**
   ```bash
   # Application will create secure storage directory automatically:
   # Windows: %APPDATA%/crypto_trader/
   # Linux: ~/.local/share/crypto_trader/
   # macOS: ~/Library/Application Support/crypto_trader/
   ```

3. **Set Up API Credentials** (Optional)
   - Obtain Binance testnet API credentials
   - Never use live trading credentials
   - Follow [API setup guide](../user/getting-started.md#api-setup)

### Security Validation Checklist

- [ ] Paper trading mode indicator visible
- [ ] No live trading URLs accessible
- [ ] Secure storage directory created with proper permissions
- [ ] Application runs without admin/root privileges
- [ ] Network connections only to testnet endpoints

## 🌐 Network Configuration

### Firewall Settings

**Outbound Connections Required:**
- `testnet.binance.vision:443` (HTTPS API)
- `testnet-stream.binance.vision:9443` (WebSocket)

**Blocked Connections:**
- `api.binance.com` (Live trading - blocked by application)
- Any non-testnet cryptocurrency exchange APIs

### Proxy Configuration

If behind a corporate proxy:

```bash
# Set proxy environment variables
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080

# For npm during build
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

## 📂 Directory Structure

Post-installation directory layout:

```
crypto_trader/
├── crypto_trader.exe           # Main executable (Windows)
├── crypto_trader              # Main executable (Linux)
├── frontend_dist/             # Web UI assets
│   ├── index.html
│   ├── assets/
│   └── particle-worker.js
├── WebView2Loader.dll         # WebView2 runtime (Windows)
├── README.md                  # Quick start guide
└── data/                      # User data directory
    ├── secure_storage/        # Encrypted credentials
    ├── logs/                  # Application logs
    └── config/                # Configuration files
```

## 🔍 Verification Steps

### Post-Installation Testing

1. **Application Launch**
   ```bash
   # Launch application
   ./crypto_trader
   
   # Check for successful startup
   # - Window opens without errors
   # - Paper trading indicator visible
   # - No network errors in console
   ```

2. **Security Verification**
   ```bash
   # Verify no live trading endpoints accessible
   # Check network traffic (optional)
   netstat -an | grep 443  # Should only show testnet connections
   ```

3. **Feature Testing**
   - Navigation between panels works
   - Settings panel opens and validates input
   - Market data loads (if API configured)
   - No error dialogs appear

### Common Installation Issues

**Issue**: WebView2 not found (Windows)
```bash
# Solution: Install WebView2 Runtime
# Download from Microsoft and install
```

**Issue**: Build fails with "cl.exe not found" (Windows)
```bash
# Solution: Install Visual Studio Build Tools
# Ensure C++ build tools are selected during installation
```

**Issue**: Permission denied (Linux/macOS)
```bash
# Solution: Make executable
chmod +x crypto_trader
# Or check directory permissions
```

**Issue**: Network connection fails
```bash
# Solution: Check firewall settings
# Ensure testnet.binance.vision is accessible
# Test: curl https://testnet.binance.vision/api/v3/ping
```

## 🚀 Performance Optimization

### GPU Acceleration Setup

**Windows (NVIDIA):**
```bash
# Ensure NVIDIA drivers are updated
# GPU acceleration enabled automatically if available
```

**Linux (NVIDIA):**
```bash
# Install NVIDIA drivers
sudo apt install nvidia-driver-535
# Restart system after installation
```

**Fallback to CPU:**
- Application automatically falls back to CPU rendering if GPU unavailable
- Performance remains adequate for paper trading operations

### Memory Optimization

For systems with limited RAM:

1. **Reduce Particle Count**
   - Access Settings → Display → Particle Effects
   - Reduce particle count to 1000 or less

2. **Disable GPU Acceleration**
   - Settings → Performance → Force CPU Mode

## 🔄 Updates and Maintenance

### Automatic Updates
- Application checks for updates on startup
- Security updates are automatically downloaded
- User confirmation required for feature updates

### Manual Updates
```bash
# Download latest version
# Replace executable with new version
# Configuration and data preserved automatically
```

### Backup Recommendations
```bash
# Backup configuration (optional)
# Windows: Copy %APPDATA%/crypto_trader/
# Linux: Copy ~/.local/share/crypto_trader/
# macOS: Copy ~/Library/Application Support/crypto_trader/
```

## 📞 Installation Support

### Troubleshooting Resources
- [Troubleshooting Guide](./troubleshooting.md)
- [FAQ](../user/faq.md)
- GitHub Issues: Create issue with installation logs

### Log Collection
```bash
# Collect installation logs
# Windows: %APPDATA%/crypto_trader/logs/
# Linux: ~/.local/share/crypto_trader/logs/
# macOS: ~/Library/Application Support/crypto_trader/logs/
```

---

## ✅ Installation Complete

After successful installation:

1. **Read**: [Getting Started Guide](../user/getting-started.md)
2. **Configure**: [Settings Guide](../user/settings-guide.md) 
3. **Learn**: [Trading Guide](../user/trading-guide.md)

**Remember**: This application is for paper trading only. Always verify the paper trading indicator is visible before use.