@echo off
REM AI Post Robot - Windows Deployment Script
REM Interactive wrapper for the Node.js deployment script

echo 🤖 AI Post Robot - Windows Deployment
echo =====================================

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if deploy.js exists
if not exist "deploy.js" (
    echo ❌ Error: deploy.js not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

REM If argument provided, use it directly
if not "%1"=="" (
    echo 🚀 Running deployment with argument: %1
    node deploy.js %1
    goto :end
)

REM Interactive deployment menu
echo.
echo 📋 Available Deployment Options:
echo ================================
echo [1] Local Deployment (node deploy.js local)
echo [2] GitHub Deployment (node deploy.js github)
echo [3] Show Help (node deploy.js)
echo [4] Exit
echo.

:menu
set /p choice="Please select an option (1-4): "

if "%choice%"=="1" (
    echo.
    echo 🏠 Starting Local Deployment...
    echo ===============================
    node deploy.js local
    if %errorlevel% equ 0 (
        echo ✅ Local deployment completed successfully!
    ) else (
        echo ❌ Local deployment failed with error code %errorlevel%
    )
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo 🌐 Starting GitHub Deployment...
    echo ================================
    node deploy.js github
    if %errorlevel% equ 0 (
        echo ✅ GitHub deployment completed successfully!
    ) else (
        echo ❌ GitHub deployment failed with error code %errorlevel%
    )
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo 📖 Showing Deployment Help...
    echo =============================
    node deploy.js
    echo.
    echo Press any key to return to menu...
    pause >nul
    goto :menu
)

if "%choice%"=="4" (
    echo 👋 Goodbye!
    exit /b 0
)

echo ❌ Invalid choice. Please select 1, 2, 3, or 4.
echo.
goto :menu

:end
echo.
echo 🏁 Deployment process finished.
pause
