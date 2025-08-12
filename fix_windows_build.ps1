# Windows Build Fix Script
# Run this PowerShell script as Administrator to fix the build issues

Write-Host "🔧 Fixing Windows Build Environment" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Please run this script as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Install Visual Studio Build Tools
Write-Host "📦 Installing Visual Studio Build Tools..." -ForegroundColor Yellow

# Download Visual Studio Build Tools
$buildToolsUrl = "https://aka.ms/vs/17/release/vs_buildtools.exe"
$buildToolsPath = "$env:TEMP\vs_buildtools.exe"

Write-Host "Downloading Visual Studio Build Tools..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $buildToolsUrl -OutFile $buildToolsPath
    Write-Host "✅ Downloaded Visual Studio Build Tools" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download build tools" -ForegroundColor Red
    exit 1
}

# Install with required components
Write-Host "Installing build tools with required components..." -ForegroundColor Cyan
$installArgs = @(
    "--quiet",
    "--wait",
    "--add", "Microsoft.VisualStudio.Workload.VCTools",
    "--add", "Microsoft.VisualStudio.Component.VC.Tools.x64.x86",
    "--add", "Microsoft.VisualStudio.Component.Windows10SDK.19041"
)

Start-Process -FilePath $buildToolsPath -ArgumentList $installArgs -Wait

# Install Rust Windows target
Write-Host "🦀 Setting up Rust Windows target..." -ForegroundColor Yellow
rustup target add x86_64-pc-windows-msvc

# Verify installation
Write-Host "✅ Verifying installation..." -ForegroundColor Green

# Check if dlltool is available
$dlltoolPath = Get-Command "dlltool.exe" -ErrorAction SilentlyContinue
if ($dlltoolPath) {
    Write-Host "✅ dlltool.exe found at: $($dlltoolPath.Source)" -ForegroundColor Green
} else {
    Write-Host "⚠️  dlltool.exe not found in PATH, checking Visual Studio..." -ForegroundColor Yellow
    
    # Common Visual Studio locations
    $vsPaths = @(
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\*\bin\Hostx64\x64",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\*\bin\Hostx64\x64",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC\*\bin\Hostx64\x64"
    )
    
    foreach ($path in $vsPaths) {
        $dlltool = Get-ChildItem -Path $path -Filter "dlltool.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($dlltool) {
            Write-Host "✅ Found dlltool.exe at: $($dlltool.FullName)" -ForegroundColor Green
            break
        }
    }
}

# Install additional Rust components
Write-Host "📦 Installing additional Rust components..." -ForegroundColor Yellow
rustup component add rustfmt
rustup component add clippy

# Set up environment variables
Write-Host "⚙️  Setting up environment variables..." -ForegroundColor Yellow

# Add Visual Studio tools to PATH
$vsWherePath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsWherePath) {
    $vsPath = & $vsWherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x64.x86 -property installationPath
    if ($vsPath) {
        $vcToolsPath = Get-ChildItem -Path "$vsPath\VC\Tools\MSVC\*\bin\Hostx64\x64" | Select-Object -First 1
        if ($vcToolsPath) {
            $env:PATH += ";$($vcToolsPath.FullName)"
            Write-Host "✅ Added Visual Studio tools to PATH" -ForegroundColor Green
        }
    }
}

# Test build
Write-Host "🧪 Testing build..." -ForegroundColor Yellow
Write-Host "Running cargo check..." -ForegroundColor Cyan
Set-Location "src-tauri"
cargo check --target x86_64-pc-windows-msvc

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build environment is ready!" -ForegroundColor Green
    Write-Host "You can now run: npm run tauri build" -ForegroundColor Green
} else {
    Write-Host "❌ Build environment still has issues" -ForegroundColor Red
    Write-Host "Please restart your computer and try again" -ForegroundColor Yellow
}

Set-Location ..

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "1. Restart PowerShell/Command Prompt" -ForegroundColor Yellow
Write-Host "2. Run: npm run tauri build" -ForegroundColor Yellow
Write-Host "3. MSI will be created at: src-tauri\target\release\bundle\msi\crypto_trader_0.1.0_x64_en-US.msi" -ForegroundColor Yellow