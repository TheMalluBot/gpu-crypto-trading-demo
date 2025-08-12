@echo off
echo Building GPU Crypto Trading Demo for Windows...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Rust is installed
cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed or not in PATH
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo Node.js version:
node --version

echo.
echo Rust version:
cargo --version

echo.
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building frontend...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

echo.
echo Building Tauri application...
echo This may take 5-10 minutes on first build...
npm run tauri build
if %errorlevel% neq 0 (
    echo ERROR: Tauri build failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo BUILD SUCCESSFUL!
echo ====================================
echo.
echo Executable location:
echo   src-tauri\target\release\crypto_trader.exe
echo.
echo Installer locations:
echo   src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi
echo   src-tauri\target\release\bundle\nsis\crypto_trader_0.1.0_x64-setup.exe
echo.
echo You can now run the application!
echo.
pause