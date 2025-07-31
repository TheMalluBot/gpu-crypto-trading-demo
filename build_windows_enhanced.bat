@echo off
setlocal EnableDelayedExpansion

echo ================================================================
echo    GPU Crypto Trading Demo - Enhanced Windows Build Script
echo ================================================================
echo.

REM Set colors for output
set "SUCCESS=[92m"
set "ERROR=[91m"
set "INFO=[96m" 
set "RESET=[0m"

REM Check if running in Windows Terminal for color support
if not defined WT_SESSION (
    set "SUCCESS="
    set "ERROR="
    set "INFO="
    set "RESET="
)

echo %INFO%Checking prerequisites...%RESET%

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: Node.js is not installed or not in PATH%RESET%
    echo Please install Node.js from https://nodejs.org/
    echo Recommended version: Node.js 18 LTS or higher
    pause
    exit /b 1
)

REM Check Node version
for /f "tokens=1 delims=." %%a in ('node --version') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo %ERROR%ERROR: Node.js version 18 or higher required%RESET%
    echo Current version: 
    node --version
    echo Please upgrade from https://nodejs.org/
    pause
    exit /b 1
)

echo %SUCCESS%✓ Node.js version check passed%RESET%
node --version

REM Check if Rust is installed
echo Checking Rust installation...
cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: Rust is not installed or not in PATH%RESET%
    echo Please install Rust from https://rustup.rs/
    echo After installation, restart your terminal and try again
    pause
    exit /b 1
)

echo %SUCCESS%✓ Rust installation check passed%RESET%
cargo --version

REM Check if Tauri CLI is available
echo Checking Tauri CLI...
npx tauri --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %INFO%Installing Tauri CLI...%RESET%
    npm install -g @tauri-apps/cli
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install Tauri CLI%RESET%
        pause
        exit /b 1
    )
)

echo %SUCCESS%✓ Tauri CLI available%RESET%
npx tauri --version

echo.
echo %INFO%Starting build process...%RESET%
echo.

REM Clean previous builds
echo %INFO%Cleaning previous builds...%RESET%
if exist "node_modules" (
    echo Removing node_modules...
    rmdir /s /q "node_modules" 2>nul
)
if exist "package-lock.json" (
    echo Removing package-lock.json...
    del "package-lock.json" 2>nul
)
if exist "src-tauri\target" (
    echo Removing Rust target directory...
    rmdir /s /q "src-tauri\target" 2>nul
)

REM Clear npm cache
echo %INFO%Clearing npm cache...%RESET%
npm cache clean --force
if %errorlevel% neq 0 (
    echo %ERROR%Warning: Failed to clear npm cache%RESET%
)

REM Install dependencies with enhanced error handling
echo %INFO%Installing dependencies...%RESET%
echo This may take several minutes...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: Failed to install dependencies%RESET%
    echo.
    echo Trying alternative installation method...
    npm install --force
    if %errorlevel% neq 0 (
        echo %ERROR%ERROR: All installation methods failed%RESET%
        echo Please check your network connection and try again
        pause
        exit /b 1
    )
)

echo %SUCCESS%✓ Dependencies installed successfully%RESET%

REM Build frontend
echo.
echo %INFO%Building frontend...%RESET%
npm run build
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: Frontend build failed%RESET%
    echo.
    echo Common solutions:
    echo 1. Check for TypeScript errors: npm run type-check
    echo 2. Fix linting issues: npm run lint:fix
    echo 3. Update dependencies: npm update
    pause
    exit /b 1
)

echo %SUCCESS%✓ Frontend build completed%RESET%

REM Build Tauri application
echo.
echo %INFO%Building Tauri application...%RESET%
echo This may take 5-15 minutes on first build...
echo Please be patient while Rust compiles...
echo.

npx tauri build
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: Tauri build failed%RESET%
    echo.
    echo Common solutions:
    echo 1. Update Rust: rustup update
    echo 2. Clean Rust cache: cargo clean (in src-tauri directory)
    echo 3. Check Visual Studio Build Tools installation
    echo 4. Restart terminal and try again
    pause
    exit /b 1
)

echo.
echo %SUCCESS%================================================================%RESET%
echo %SUCCESS%                    BUILD SUCCESSFUL!                           %RESET%
echo %SUCCESS%================================================================%RESET%
echo.

REM Show build artifacts
echo %INFO%Build artifacts created:%RESET%
echo.
echo %SUCCESS%Main executable:%RESET%
if exist "src-tauri\target\release\crypto_trader.exe" (
    echo   ✓ src-tauri\target\release\crypto_trader.exe
    for %%A in ("src-tauri\target\release\crypto_trader.exe") do echo     Size: %%~zA bytes
) else (
    echo   ✗ crypto_trader.exe not found
)

echo.
echo %SUCCESS%Installers:%RESET%
if exist "src-tauri\target\release\bundle\msi" (
    echo   ✓ MSI installer(s):
    for %%f in ("src-tauri\target\release\bundle\msi\*.msi") do (
        echo     - %%~nxf
        echo       Size: %%~zf bytes
    )
) else (
    echo   ✗ No MSI installers found
)

if exist "src-tauri\target\release\bundle\nsis" (
    echo   ✓ NSIS installer(s):
    for %%f in ("src-tauri\target\release\bundle\nsis\*.exe") do (
        echo     - %%~nxf
        echo       Size: %%~zf bytes
    )
) else (
    echo   ✗ No NSIS installers found
)

echo.
echo %INFO%Application features included:%RESET%
echo   ✓ Real Binance API integration
echo   ✓ GPU-accelerated WebGPU rendering
echo   ✓ Advanced security (AES-256-GCM encryption)
echo   ✓ Comprehensive error handling
echo   ✓ LRO trading strategy implementation
echo   ✓ Paper trading mode (safe by default)
echo   ✓ Cross-platform compatibility
echo.

echo %SUCCESS%You can now run the application!%RESET%
echo Double-click: src-tauri\target\release\crypto_trader.exe
echo Or install using one of the installer files above.
echo.

REM Display build time
echo %INFO%Build completed at: %DATE% %TIME%%RESET%

pause