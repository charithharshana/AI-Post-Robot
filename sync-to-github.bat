@echo off
setlocal enabledelayedexpansion

REM AI Post Robot - GitHub Sync Script (Windows)
REM This script syncs only Chrome extension files to GitHub while keeping development files local

echo 🤖 AI Post Robot - GitHub Sync Script
echo ======================================

REM Configuration
set "GITHUB_REPO=https://github.com/charithharshana/AI-Post-Robot.git"
set "TEMP_DIR=temp-github-sync"
set "BRANCH=main"

REM Check if we're in the right directory
if not exist "manifest.json" (
    echo ❌ Error: manifest.json not found. Please run this script from the extension root directory.
    pause
    exit /b 1
)

REM Check for uncommitted changes
git status --porcelain > nul 2>&1
if !errorlevel! equ 0 (
    for /f %%i in ('git status --porcelain') do (
        echo ⚠️  Warning: You have uncommitted changes in your local repository.
        echo    It's recommended to commit your changes first.
        set /p "continue=   Continue anyway? (y/N): "
        if /i not "!continue!"=="y" (
            echo ❌ Sync cancelled.
            pause
            exit /b 1
        )
        goto :continue
    )
)
:continue

echo 📁 Creating temporary directory...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo 📋 Copying extension files...
copy "manifest.json" "%TEMP_DIR%\" > nul
copy "background.js" "%TEMP_DIR%\" > nul
copy "content.js" "%TEMP_DIR%\" > nul
copy "popup.html" "%TEMP_DIR%\" > nul
copy "popup.js" "%TEMP_DIR%\" > nul
copy "options.html" "%TEMP_DIR%\" > nul
copy "options.js" "%TEMP_DIR%\" > nul
copy "advanced-scheduler.html" "%TEMP_DIR%\" > nul
copy "advanced-scheduler.js" "%TEMP_DIR%\" > nul
copy "schedule.html" "%TEMP_DIR%\" > nul
copy "schedule.js" "%TEMP_DIR%\" > nul
copy "robopost-api.js" "%TEMP_DIR%\" > nul
copy "gemini-api.js" "%TEMP_DIR%\" > nul
copy "README.md" "%TEMP_DIR%\" > nul
xcopy "icons" "%TEMP_DIR%\icons\" /e /i /q > nul
xcopy "image-editor-module" "%TEMP_DIR%\image-editor-module\" /e /i /q > nul

echo 🔧 Setting up git repository...
cd "%TEMP_DIR%"
git init
git add .
git commit -m "Update Chrome extension files - Auto-sync from development repository"

echo 🚀 Pushing to GitHub...
git remote add origin "%GITHUB_REPO%"
git push -f origin HEAD:%BRANCH%

cd ..
echo 🧹 Cleaning up...
rmdir /s /q "%TEMP_DIR%"

echo ✅ Sync completed successfully!
echo    GitHub repository updated with latest extension files.
echo    Local development files remain unchanged.
echo.
echo 🔗 View on GitHub: https://github.com/charithharshana/AI-Post-Robot
pause
