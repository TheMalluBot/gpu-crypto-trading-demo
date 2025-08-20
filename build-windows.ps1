# GPU Crypto Trader Pro - Windows Build Script
# PowerShell script for building Windows releases

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("release", "debug")]
    [string]$BuildType = "release",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("msi", "nsis", "portable", "all")]
    [string]$Target = "all"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GPU Crypto Trader Pro - Windows Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust version: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Rust is not installed!" -ForegroundColor Red
    Write-Host "  Please install Rust from https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

# Check Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "✓ Cargo version: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Cargo is not installed!" -ForegroundColor Red
    exit 1
}

# Check for CUDA (optional for GPU features)
try {
    $cudaPath = $env:CUDA_PATH
    if ($cudaPath) {
        Write-Host "✓ CUDA found at: $cudaPath" -ForegroundColor Green
    } else {
        Write-Host "⚠ CUDA not found (GPU features may be limited)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ CUDA not detected" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install Node dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install Node dependencies" -ForegroundColor Red
    exit 1
}

# Install Rust dependencies
Write-Host "Installing Rust dependencies..." -ForegroundColor Cyan
Set-Location src-tauri
cargo fetch
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to fetch Rust dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Install Tauri CLI if not present
Write-Host "Checking Tauri CLI..." -ForegroundColor Cyan
try {
    $tauriVersion = cargo tauri --version
    Write-Host "✓ Tauri CLI version: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "Installing Tauri CLI..." -ForegroundColor Yellow
    cargo install tauri-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install Tauri CLI" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Building application..." -ForegroundColor Yellow

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
if (Test-Path "src-tauri/target/release/bundle") {
    Remove-Item -Recurse -Force "src-tauri/target/release/bundle"
}

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green

# Set build arguments based on target
$buildArgs = @()
if ($BuildType -eq "release") {
    $buildArgs += "--release"
}

if ($Target -ne "all") {
    $buildArgs += "--bundles"
    $buildArgs += $Target
}

# Build Tauri application
Write-Host "Building Tauri application..." -ForegroundColor Cyan
Write-Host "Build type: $BuildType" -ForegroundColor White
Write-Host "Target: $Target" -ForegroundColor White

cargo tauri build @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Tauri build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Build completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# List output files
$bundlePath = "src-tauri\target\release\bundle"
if (Test-Path $bundlePath) {
    Write-Host "Build artifacts:" -ForegroundColor Cyan
    
    # Check for MSI
    if (Test-Path "$bundlePath\msi") {
        $msiFiles = Get-ChildItem "$bundlePath\msi\*.msi"
        foreach ($file in $msiFiles) {
            Write-Host "  MSI: $($file.Name)" -ForegroundColor White
            Write-Host "       Size: $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
        }
    }
    
    # Check for NSIS
    if (Test-Path "$bundlePath\nsis") {
        $nsisFiles = Get-ChildItem "$bundlePath\nsis\*.exe"
        foreach ($file in $nsisFiles) {
            Write-Host "  NSIS: $($file.Name)" -ForegroundColor White
            Write-Host "        Size: $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "Installers location: $bundlePath" -ForegroundColor Yellow
}

# Create portable version if requested
if ($Target -eq "all" -or $Target -eq "portable") {
    Write-Host ""
    Write-Host "Creating portable version..." -ForegroundColor Cyan
    
    $portableDir = "dist-portable"
    if (Test-Path $portableDir) {
        Remove-Item -Recurse -Force $portableDir
    }
    New-Item -ItemType Directory -Path $portableDir | Out-Null
    
    # Copy executable
    $exePath = "src-tauri\target\release\gpu-crypto-trader-pro.exe"
    if (Test-Path $exePath) {
        Copy-Item $exePath "$portableDir\"
        
        # Create portable config
        @"
{
  "portable": true,
  "dataDir": "./data",
  "configDir": "./config"
}
"@ | Out-File "$portableDir\portable.json" -Encoding UTF8
        
        # Compress to ZIP
        $zipPath = "GPU-Crypto-Trader-Pro-Portable-Windows.zip"
        Compress-Archive -Path "$portableDir\*" -DestinationPath $zipPath -Force
        
        Write-Host "✓ Portable version created: $zipPath" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Build complete! 🚀" -ForegroundColor Green