@echo off
echo ========================================================
echo Checking Transcription Server Status
echo ========================================================
echo.

set NODE_EXE=node

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using Node.js from system PATH
) else (
    if exist "C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe" (
        set NODE_EXE=C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe
        echo Using Node.js from: %NODE_EXE%
    ) else (
        echo ERROR: Node.js not found in PATH or expected location.
        echo Please install Node.js or update this script with the correct path.
        goto :end
    )
)

echo.
echo Running server status check...
echo.

"%NODE_EXE%" server-checker.js

:end
echo.
echo ========================================================
echo If the server is not running or responding with 404 errors,
echo please start it with run-server-improved.cmd
echo ========================================================
pause 