@echo off
echo ========================================
echo GPU Crypto Trading Demo - DEV MODE
echo ========================================
echo.
echo This will run the app in development mode
echo (no .exe needed, runs directly)
echo.

echo Installing dependencies...
npm install --legacy-peer-deps --silent

echo.
echo Starting development server...
echo The app will open in a native window
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

npx tauri dev