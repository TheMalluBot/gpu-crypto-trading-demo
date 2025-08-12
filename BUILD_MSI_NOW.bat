@echo off
setlocal enabledelayedexpansion

echo ================================================
echo 🏗️  Crypto Trader MSI Builder - Quick Fix
echo ================================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Administrator privileges required
    echo Please run as Administrator
    pause
    exit /b 1
)

echo ✅ Running as Administrator

REM Quick fix for dlltool.exe issue
echo.
echo 🔧 Fixing dlltool.exe issue...

REM Check if Visual Studio Build Tools are installed
where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Visual Studio Build Tools...
    
    REM Download and install Visual Studio Build Tools
    echo Downloading Visual Studio Build Tools...
    powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile '%TEMP%\vs_buildtools.exe'"
    
    echo Installing Visual Studio Build Tools...
    %TEMP%\vs_buildtools.exe --quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.x64.x86 --add Microsoft.VisualStudio.Component.Windows10SDK.19041
    
    echo ✅ Visual Studio Build Tools installed
    echo Please restart your computer and run this script again
    pause
    exit /b 0
)

echo ✅ Visual Studio Build Tools found

REM Ensure Rust Windows target is installed
echo.
echo 🦀 Checking Rust Windows target...
rustup target list --installed | findstr "x86_64-pc-windows-msvc" >nul
if %errorlevel% neq 0 (
    echo Installing Windows target...
    rustup target add x86_64-pc-windows-msvc
)

echo ✅ Rust Windows target ready

REM Clean and build
echo.
echo 🧹 Cleaning previous builds...
if exist "src-tauri\target" rmdir /s /q "src-tauri\target"
if exist "dist" rmdir /s /q "dist"

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo 🏗️  Building MSI installer...
echo This will take 5-10 minutes...
echo.

call npm run tauri build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    echo.
    echo Try these steps:
    echo 1. Restart your computer
    echo 2. Run Windows Update
    echo 3. Install Visual Studio 2022 Build Tools manually
    echo 4. Run this script again
    pause
    exit /b 1
)

echo.
echo ✅ MSI build completed successfully!
echo.
set MSI_PATH=src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi

if exist "%MSI_PATH%" (
    echo 📦 MSI file created: %MSI_PATH%
    
    REM Get file size
    for %%A in ("%MSI_PATH%") do (
        set MSI_SIZE=%%~zA
    )
    
    echo 📊 Size: %MSI_SIZE% bytes (~%MSI_SIZE:~0,-6%MB)
    
    echo.
    echo 🎯 Installation options:
    echo 1. Double-click: %MSI_PATH%
    echo 2. Command line: msiexec /i "%MSI_PATH%"
    echo 3. Silent install: msiexec /i "%MSI_PATH%" /quiet
    
) else (
    echo ❌ MSI file not found
    dir /s /b "*.msi" 2>nul
)

echo.
pause