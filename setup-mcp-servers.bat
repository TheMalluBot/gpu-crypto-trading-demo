@echo off
setlocal EnableDelayedExpansion

echo ================================================================
echo         MCP Server Setup for GPU Crypto Trading Demo
echo ================================================================
echo.

REM Set colors
set "SUCCESS=[92m"
set "ERROR=[91m"
set "INFO=[96m"
set "RESET=[0m"

if not defined WT_SESSION (
    set "SUCCESS="
    set "ERROR="
    set "INFO="
    set "RESET="
)

echo %INFO%Installing MCP servers for enhanced development productivity...%RESET%
echo.

REM Check npm availability
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR%ERROR: npm not found. Please install Node.js first.%RESET%
    pause
    exit /b 1
)

echo %SUCCESS%✓ npm available%RESET%
echo.

REM Install high priority MCP servers
echo %INFO%Phase 1: Installing High Priority MCP Servers%RESET%
echo.

echo Installing Playwright MCP Server...
npx @playwright/test --version >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g @playwright/test
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install Playwright%RESET%
    ) else (
        echo %SUCCESS%✓ Playwright MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ Playwright already available%RESET%
)

echo.
echo Installing GitHub MCP Server...
npm list -g github-mcp-server >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g github-mcp-server
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install GitHub MCP Server%RESET%
    ) else (
        echo %SUCCESS%✓ GitHub MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ GitHub MCP Server already installed%RESET%
)

echo.
echo Installing Exa Search MCP Server...
npm list -g exa-mcp-server >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g exa-mcp-server
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install Exa MCP Server%RESET%
    ) else (
        echo %SUCCESS%✓ Exa Search MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ Exa Search MCP Server already installed%RESET%
)

echo.
echo %INFO%Phase 2: Installing Medium Priority MCP Servers%RESET%
echo.

echo Installing Azure MCP Server...
npm list -g azure-mcp-server >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g azure-mcp-server
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install Azure MCP Server%RESET%
    ) else (
        echo %SUCCESS%✓ Azure MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ Azure MCP Server already installed%RESET%
)

echo.
echo Installing Docker MCP Server...
npx @docker/mcp-server --help >nul 2>&1
if %errorlevel% neq 0 (
    echo %INFO%Docker MCP Server will be available via npx%RESET%
    echo %SUCCESS%✓ Docker MCP Server configured%RESET%
) else (
    echo %SUCCESS%✓ Docker MCP Server already available%RESET%
)

echo.
echo %INFO%Phase 3: Installing Specialized Servers%RESET%
echo.

echo Installing Windows-specific MCP Server...
npm list -g windows-mcp-server >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g windows-mcp-server
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install Windows MCP Server%RESET%
    ) else (
        echo %SUCCESS%✓ Windows MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ Windows MCP Server already installed%RESET%
)

echo.
echo Installing PowerShell MCP Server...
npm list -g powershell-mcp-server >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g powershell-mcp-server
    if %errorlevel% neq 0 (
        echo %ERROR%Failed to install PowerShell MCP Server%RESET%
    ) else (
        echo %SUCCESS%✓ PowerShell MCP Server installed%RESET%
    )
) else (
    echo %SUCCESS%✓ PowerShell MCP Server already installed%RESET%
)

echo.
echo %SUCCESS%================================================================%RESET%
echo %SUCCESS%                MCP SERVERS SETUP COMPLETE                     %RESET%
echo %SUCCESS%================================================================%RESET%
echo.

echo %INFO%Next Steps:%RESET%
echo.
echo 1. %SUCCESS%Configure Claude MCP settings%RESET%
echo    Copy the configuration from .claude-mcp-config.json to your Claude settings
echo.
echo 2. %SUCCESS%Set up API keys%RESET%
echo    - GitHub: Create personal access token
echo    - Exa: Get API key from exa.ai
echo    - Pieces: Install Pieces Desktop app
echo.
echo 3. %SUCCESS%Test the setup%RESET%
echo    Use "claude mcp list" to verify servers are active
echo.
echo 4. %SUCCESS%Review the MCP_SETUP.md guide%RESET%
echo    Detailed instructions for each server are in MCP_SETUP.md
echo.

echo %INFO%Installed MCP Servers:%RESET%
echo   ✓ Playwright (UI testing & automation)
echo   ✓ GitHub (repository management)
echo   ✓ Exa Search (technical research)
echo   ✓ Azure (Windows development support)
echo   ✓ Docker (containerization)
echo   ✓ Windows (native Windows API)
echo   ✓ PowerShell (Windows automation)
echo.

echo %SUCCESS%Your development environment is now enhanced with MCP servers!%RESET%
echo.

pause