@echo off
setlocal enabledelayedexpansion

REM AI Post Robot - GitHub Sync Script (Windows)
REM This script syncs only Chrome extension files to GitHub while keeping development files local

echo 🤖 AI Post Robot - GitHub Sync Script
echo ======================================

REM Configuration
set "GITHUB_REPO=https://github.com/charithharshana/AI-Post-Robot.git"
set "TEMP_DIR=temp-github-sync"
set "EXTENSION_DIR=extension"
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

echo 📁 Creating local extension directory...
if not exist "%EXTENSION_DIR%" mkdir "%EXTENSION_DIR%"

echo 📋 Copying extension files to local extension directory...
copy "manifest.json" "%EXTENSION_DIR%\" > nul
copy "background.js" "%EXTENSION_DIR%\" > nul
copy "content.js" "%EXTENSION_DIR%\" > nul
copy "popup.html" "%EXTENSION_DIR%\" > nul
copy "popup.js" "%EXTENSION_DIR%\" > nul
copy "options.html" "%EXTENSION_DIR%\" > nul
copy "options.js" "%EXTENSION_DIR%\" > nul
copy "advanced-scheduler.html" "%EXTENSION_DIR%\" > nul
copy "advanced-scheduler.js" "%EXTENSION_DIR%\" > nul
copy "schedule.html" "%EXTENSION_DIR%\" > nul
copy "schedule.js" "%EXTENSION_DIR%\" > nul
copy "robopost-api.js" "%EXTENSION_DIR%\" > nul
copy "gemini-api.js" "%EXTENSION_DIR%\" > nul
copy "README.md" "%EXTENSION_DIR%\" > nul
if exist "icons" xcopy "icons" "%EXTENSION_DIR%\icons\" /e /i /q > nul
if exist "image-editor-module" xcopy "image-editor-module" "%EXTENSION_DIR%\image-editor-module\" /e /i /q > nul

echo ✅ Local extension directory updated: %EXTENSION_DIR%\
echo    You can now load this directory as an unpacked extension in Chrome for testing.
echo.

echo 📁 Creating temporary directory for GitHub sync...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo 📋 Copying extension files to temporary directory for GitHub...
xcopy "%EXTENSION_DIR%" "%TEMP_DIR%" /e /i /q > nul

echo 🔧 Setting up git repository...
cd "%TEMP_DIR%"
git init
git add .

REM Create commit message with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

git commit -m "Update Chrome extension files - Auto-sync from development repository - %timestamp%"

echo 🚀 Pushing to GitHub (only changed files)...
git remote add origin "%GITHUB_REPO%"
git push -f origin HEAD:%BRANCH%

cd ..
echo 🧹 Cleaning up temporary directory...
rmdir /s /q "%TEMP_DIR%"

echo ✅ Sync completed successfully!
echo    📁 Local extension directory: %EXTENSION_DIR%\ (ready for Chrome testing)
echo    🚀 GitHub repository updated with latest extension files
echo    📝 Local development files remain unchanged
echo.
echo 🔗 View on GitHub: https://github.com/charithharshana/AI-Post-Robot
echo 💡 To test: Load the '%EXTENSION_DIR%' folder as an unpacked extension in Chrome
pause
