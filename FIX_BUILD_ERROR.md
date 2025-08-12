# Fix Build Error - Rollup Dependencies

## Error Analysis
The error indicates a missing Rollup native module for Windows (`@rollup/rollup-win32-x64-msvc`). This is a known npm bug with optional dependencies.

## Quick Fix (Run these commands in PowerShell)

```powershell
# 1. Clean the project
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 2. Clear npm cache
npm cache clean --force

# 3. Reinstall dependencies
npm install

# 4. Try the build again
npm run tauri build
```

## Alternative Fix (If above doesn't work)

```powershell
# 1. Clean everything
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
Remove-Item -Recurse -Force src-tauri/target

# 2. Update npm and node
npm install -g npm@latest

# 3. Install with legacy peer deps flag
npm install --legacy-peer-deps

# 4. Build again
npm run tauri build
```

## If Still Failing - Manual Rollup Fix

```powershell
# Install the specific missing dependency
npm install @rollup/rollup-win32-x64-msvc --save-dev

# Then build
npm run tauri build
```