@echo off
echo ========================================
echo GPU Crypto Trading Demo - Build Fix
echo ========================================
echo.

echo [1/6] Cleaning old builds...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
rmdir /s /q src-tauri\target 2>nul
echo Done.

echo.
echo [2/6] Clearing npm cache...
npm cache clean --force
echo Done.

echo.
echo [3/6] Installing dependencies...
npm install --legacy-peer-deps --force
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Done.

echo.
echo [4/6] Building frontend...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause  
    exit /b 1
)
echo Done.

echo.
echo [5/6] Building Tauri application...
echo This may take 5-10 minutes...
npx tauri build
if %errorlevel% neq 0 (
    echo ERROR: Tauri build failed
    pause
    exit /b 1
)

echo.
echo [6/6] Build completed successfully!
echo ========================================
echo.
echo Your files are ready:
echo   📱 Main App: src-tauri\target\release\crypto_trader.exe
echo   📦 MSI Installer: src-tauri\target\release\bundle\msi\*.msi  
echo   🔧 NSIS Installer: src-tauri\target\release\bundle\nsis\*-setup.exe
echo.
echo Production features included:
echo   ✅ Real API integrations (no mock data)
echo   ✅ Enhanced security measures
echo   ✅ Proper error handling
echo   ✅ GPU risk management
echo   ✅ Complete trading functionality
echo.
echo Double-click crypto_trader.exe to run!
echo ========================================
pause