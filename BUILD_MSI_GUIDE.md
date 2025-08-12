# 🏗️ MSI Installer Build Guide

## 📦 **MSI File Generation**

Since you're requesting the .msi file, here's the complete guide to generate it on Windows:

### **🚀 Quick MSI Generation (5 minutes)**

#### **Method 1: Automated Script (Recommended)**
```cmd
# Run the enhanced build script
build_windows_enhanced.bat
```

#### **Method 2: Manual Build**
```cmd
# 1. Install dependencies
npm install

# 2. Build the application
npm run tauri build

# 3. MSI will be generated at:
src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi
```

### **📁 Expected MSI Output**
```
src-tauri\target\release\bundle\msi\
├── crypto_trader_0.1.0_x64_en-US.msi    (19MB)
├── crypto_trader_0.1.0_x64_en-US.msi.zip
└── wix/
    ├── main.wxs
    └── *.wxi
```

## 🔧 **Pre-Build Requirements**

### **Windows Prerequisites**
1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Rust** - Install via [rustup.rs](https://rustup.rs/)
3. **Visual Studio Build Tools** - [Download here](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### **Required Components**
- **MSVC v143 - VS 2022 C++ x64/x86 build tools**
- **Windows 10 SDK** (latest)
- **C++ CMake tools for Windows**

## 🎯 **Step-by-Step MSI Build**

### **Step 1: Environment Setup**
```cmd
# Install Rust Windows target
rustup target add x86_64-pc-windows-msvc

# Install Tauri CLI
cargo install tauri-cli

# Verify installation
rustc --version
cargo --version
```

### **Step 2: Project Setup**
```cmd
# Clone repository
git clone <your-repo-url>
cd gpu-crypto-trading-demo

# Install dependencies
npm install
```

### **Step 3: Build MSI**
```cmd
# Build release version
npm run tauri build

# Or use the enhanced script
build_windows_enhanced.bat
```

## 📊 **MSI File Details**

| **Property** | **Value** |
|--------------|-----------|
| **File Name** | `crypto_trader_0.1.0_x64_en-US.msi` |
| **Size** | ~19MB |
| **Architecture** | x64 |
| **Language** | en-US |
| **Installer Type** | MSI (Windows Installer) |
| **Digital Signature** | Unsigned (can be added) |

## 🚀 **Alternative: Pre-built MSI**

Since you need the MSI immediately, here's what you can do:

### **Option 1: GitHub Actions Build**
The project includes automated Windows builds via GitHub Actions:
- Check `.github/workflows/build-windows.yml`
- Download MSI from GitHub Releases (when available)

### **Option 2: Local Build Script**
```cmd
@echo off
REM Save as build_msi.bat

echo Building Crypto Trader MSI Installer...
echo.

REM Check prerequisites
where node >nul 2>&1 || (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

where cargo >nul 2>&1 || (
    echo ERROR: Rust not found. Install from https://rustup.rs/
    pause
    exit /b 1
)

REM Build the MSI
echo Installing dependencies...
npm install

echo Building MSI...
npm run tauri build

echo.
echo MSI Build Complete!
echo.
echo Location: src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi
echo Size: ~19MB
pause
```

## 📥 **Download Instructions**

### **For Immediate Use:**
1. **Run on Windows machine**: Use the build scripts above
2. **GitHub Actions**: Check releases for pre-built MSI
3. **Development build**: Use `npm run tauri dev` for testing

### **File Verification**
```cmd
# Verify MSI integrity
certutil -hashfile crypto_trader_0.1.0_x64_en-US.msi SHA256

# Check digital signature
signtool verify /pa crypto_trader_0.1.0_x64_en-US.msi
```

## 🎯 **Installation Instructions**

### **Silent Install**
```cmd
# Install without user interaction
msiexec /i crypto_trader_0.1.0_x64_en-US.msi /quiet

# Install with progress bar
msiexec /i crypto_trader_0.1.0_x64_en-US.msi /passive
```

### **Standard Install**
1. **Double-click** the MSI file
2. **Follow** the installation wizard
3. **Launch** from Start Menu or Desktop shortcut

## 🔍 **Troubleshooting**

### **Build Issues**
```cmd
# Clean build
cargo clean
npm run tauri build

# Check build tools
rustup show
```

### **MSI Installation Issues**
```cmd
# Run as Administrator
# Right-click MSI → "Run as administrator"

# Check Windows Installer service
sc query msiserver
```

## 📞 **Support**

### **Build Help**
- **Discord**: Tauri Discord server
- **GitHub**: Create issue in repository
- **Documentation**: [Tauri Build Guide](https://tauri.app/v1/guides/building/)

---

**🚨 Important**: The MSI file must be built on Windows. Use the provided scripts or GitHub Actions for automated builds.