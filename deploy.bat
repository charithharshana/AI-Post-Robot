@echo off
setlocal enabledelayedexpansion
REM AI Post Robot - Extension Deployment Script
REM Copies extension files to distribution directory and manages git repositories

echo 🤖 AI Post Robot - Extension Deployment
echo ========================================

REM Configuration
set "EXTENSION_SOURCE=extension"
set "EXTENSION_DIST=..\extension\extension"
set "DEV_REPO_URL=https://github.com/charithharshana/AI-Post-Robot-Development.git"
set "DIST_REPO_URL=https://github.com/charithharshana/AI-Post-Robot.git"

REM Check if extension source directory exists
if not exist "%EXTENSION_SOURCE%" (
    echo ❌ Error: Extension source directory '%EXTENSION_SOURCE%' not found
    echo Please run this script from the AI-Post-Robot-master directory
    pause
    exit /b 1
)

REM Create distribution directory if it doesn't exist
if not exist "%EXTENSION_DIST%" (
    echo 📁 Creating distribution directory: %EXTENSION_DIST%
    mkdir "%EXTENSION_DIST%" 2>nul
    if not exist "%EXTENSION_DIST%" (
        echo ❌ Error: Failed to create distribution directory
        echo Please ensure the parent directory exists: ..\extension\
        pause
        exit /b 1
    )
)

echo 📋 Copying extension files...
echo Source: %EXTENSION_SOURCE%
echo Destination: %EXTENSION_DIST%
echo.

REM Copy all files and directories from extension source to distribution
xcopy "%EXTENSION_SOURCE%\*" "%EXTENSION_DIST%\" /E /Y /I >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to copy extension files
    pause
    exit /b 1
)

echo ✅ Extension files copied successfully!
echo.

REM Navigate to distribution directory for git operations
pushd "%EXTENSION_DIST%"

REM Check if this is a git repository
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔧 Initializing git repository in distribution directory...
    git init
    git remote add origin %DIST_REPO_URL%
    echo ✅ Git repository initialized
) else (
    echo 📡 Git repository already exists, checking remote...
    git remote get-url origin >nul 2>&1
    if %errorlevel% neq 0 (
        git remote add origin %DIST_REPO_URL%
        echo ✅ Remote origin added
    ) else (
        for /f "tokens=*" %%i in ('git remote get-url origin') do set "current_remote=%%i"
        if not "!current_remote!"=="%DIST_REPO_URL%" (
            git remote set-url origin %DIST_REPO_URL%
            echo ✅ Remote origin updated
        )
    )
)

REM Add and commit changes
echo 📝 Committing changes to distribution repository...
git add .
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('git status --porcelain ^| find /c /v ""') do set "changes=%%i"
    if !changes! gtr 0 (
        git commit -m "Update extension files - %date% %time%"
        echo ✅ Changes committed

        echo 📤 Pushing to distribution repository...
        git push -u origin main
        if %errorlevel% equ 0 (
            echo ✅ Successfully pushed to distribution repository!
        ) else (
            echo ⚠️  Push failed - you may need to pull first or resolve conflicts
        )
    ) else (
        echo ℹ️  No changes to commit
    )
) else (
    echo ❌ Error checking git status
)

popd

echo.
echo 🎉 Deployment process completed!
echo 📁 Extension files are ready in: %EXTENSION_DIST%
echo 📡 Distribution repository: %DIST_REPO_URL%
echo.

pause
