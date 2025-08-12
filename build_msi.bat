@echo off
setlocal enabledelayedexpansion

echo ================================================
echo 🏗️  Crypto Trader MSI Builder
echo ================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Administrator privileges required for MSI build
    echo Please run as Administrator
    pause
    exit /b 1
)

echo ✅ Running with Administrator privileges

REM Check prerequisites
echo.
echo 🔍 Checking prerequisites...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found
    pause
    exit /b 1
)

echo ✅ npm found: 
npm --version

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Rust/Cargo not found
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo ✅ Rust/Cargo found: 
cargo --version

where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Rust compiler not found
    pause
    exit /b 1
)

echo ✅ Rust compiler found: 
rustc --version

REM Check Windows SDK
echo.
echo 🔍 Checking Windows SDK...
if exist "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" (
    echo ✅ Windows SDK found
) else (
    echo ⚠️  Windows SDK not found - may need Visual Studio Build Tools
)

REM Set up environment
echo.
echo ⚙️  Setting up build environment...
set RUST_BACKTRACE=1
set CARGO_INCREMENTAL=1
set RUSTFLAGS=-C target-cpu=native

REM Clean previous builds
echo.
echo 🧹 Cleaning previous builds...
if exist "src-tauri\target" (
    echo Cleaning target directory...
    rmdir /s /q "src-tauri\target" 2>nul
)

if exist "dist" (
    echo Cleaning dist directory...
    rmdir /s /q "dist" 2>nul
)

if exist "node_modules" (
    echo Cleaning node_modules...
    rmdir /s /q "node_modules" 2>nul
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Build frontend
echo.
echo 🏗️  Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

echo ✅ Frontend built successfully

REM Build MSI installer
echo.
echo 🔨 Building MSI installer...
echo This may take 5-10 minutes...
echo.

call npm run tauri build
if %errorlevel% neq 0 (
    echo ❌ MSI build failed
    echo.
    echo Common fixes:
    echo 1. Install Visual Studio Build Tools
    echo 2. Install Windows SDK
    echo 3. Run: rustup target add x86_64-pc-windows-msvc
    pause
    exit /b 1
)

echo.
echo ✅ MSI build completed successfully!
echo.

REM Verify MSI file
echo 🔍 Verifying MSI file...
set MSI_PATH=src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi

if exist "%MSI_PATH%" (
    echo ✅ MSI file created: %MSI_PATH%
    
    REM Get file size
    for %%A in ("%MSI_PATH%") do (
        set MSI_SIZE=%%~zA
    )
    
    echo 📊 File size: %MSI_SIZE% bytes (~%MSI_SIZE:~0,-6%MB)
    
    REM Calculate SHA256
    echo 🔐 Calculating SHA256 checksum...
    certutil -hashfile "%MSI_PATH%" SHA256
    
) else (
    echo ❌ MSI file not found at expected location
    echo Checking alternative locations...
    
    dir /s /b "*.msi" 2>nul
)

echo.
echo 🎯 Installation commands:
echo.
echo Standard install:
echo   "%MSI_PATH%"
echo.
echo Silent install:
echo   msiexec /i "%MSI_PATH%" /quiet

echo.
echo 📋 Build summary:
echo   Application: Crypto Trader v0.1.0
echo   Platform: Windows x64
echo   Installer: MSI
echo   Size: ~19MB
echo   Location: %MSI_PATH%
echo.

pause