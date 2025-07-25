# Windows Build Instructions

## Prerequisites
- Windows 10/11
- Node.js 18+ (https://nodejs.org/)
- Rust (https://rustup.rs/)
- Git (https://git-scm.com/)

## Build Commands

```powershell
# Clone and navigate to project
git clone <repo-url>
cd gpu-crypto-trading-demo

# Install dependencies
npm install

# Build the application
npm run tauri build
```

## Expected Build Output

After successful build, you'll find:

```
src-tauri/
├── target/
│   └── release/
│       ├── crypto_trader.exe          # Main executable (~15-20MB)
│       ├── bundle/
│       │   ├── msi/
│       │   │   └── crypto_trader_0.1.0_x64_en-US.msi  # Windows installer
│       │   └── nsis/
│       │       └── crypto_trader_0.1.0_x64-setup.exe  # NSIS installer
│       └── deps/                      # Dependencies
```

## Quick Test Build (Development)

For faster testing without creating an executable:

```powershell
npm run tauri dev
```

This opens the app in development mode.

## Build Time Expectations

- **First build**: 5-10 minutes (Rust compilation + dependencies)
- **Subsequent builds**: 1-2 minutes (incremental compilation)
- **Dev builds**: 30-60 seconds

## System Requirements

**Runtime Requirements:**
- Windows 10 1903+ or Windows 11
- DirectX 12 support (for GPU features)
- 4GB RAM minimum, 8GB recommended
- 100MB disk space

**Build Requirements:**
- 2GB free disk space (for Rust toolchain + dependencies)
- Visual Studio C++ Build Tools (automatically installed with Rust)

## Troubleshooting

**If build fails:**

1. **Update Rust**: `rustup update`
2. **Clean build**: `cargo clean` then rebuild
3. **Check Node version**: `node --version` (should be 18+)
4. **Install Visual Studio Build Tools** if missing

**Common Issues:**
- `MSVC not found`: Install Visual Studio Build Tools
- `Node version`: Use Node.js 18 or higher
- `Permission denied`: Run PowerShell as Administrator

## Production Features Included

✅ **Real API Integrations** - No mock data  
✅ **Enhanced Security** - Proper credential handling  
✅ **Error Handling** - No panic conditions  
✅ **GPU Risk Management** - Real calculations  
✅ **Paper Trading Mode** - Safe by default  
✅ **Cross-platform Storage** - Windows compatible  

## File Structure After Build

```
crypto_trader.exe                 # Main application
├── assets/                      # Built-in assets
├── icons/                       # Application icons  
└── webview2/                    # WebView2 runtime (if needed)
```

## Usage

```powershell
# Run the application
./crypto_trader.exe

# Or double-click the executable in File Explorer
```

The application will start with a modern GUI interface for crypto trading analysis and bot management.