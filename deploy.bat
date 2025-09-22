@echo off
REM AI Post Robot - Windows Deployment Script
REM Simple wrapper for the Node.js deployment script

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

REM Run the Node.js deployment script
if "%1"=="" (
    node deploy.js
) else (
    node deploy.js %1
)

pause
