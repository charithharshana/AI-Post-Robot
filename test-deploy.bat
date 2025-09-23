@echo off
echo Testing deployment script...
echo Current directory: %CD%
echo.

echo Checking extension source directory...
if exist "extension" (
    echo ✅ Extension directory found
    dir extension
) else (
    echo ❌ Extension directory not found
)

echo.
echo Checking parent extension directory...
if exist "..\extension" (
    echo ✅ Parent extension directory found
    dir "..\extension"
) else (
    echo ❌ Parent extension directory not found
)

echo.
echo Checking distribution directory...
if exist "..\extension\extension" (
    echo ✅ Distribution directory found
    dir "..\extension\extension"
) else (
    echo ❌ Distribution directory not found
)

pause
