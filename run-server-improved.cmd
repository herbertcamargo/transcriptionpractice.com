@echo off
setlocal enabledelayedexpansion

echo =================================================
echo Improved Node.js Server Launcher for Transcription
echo =================================================
echo.

:: Check if node is in PATH first
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set NODE_EXE=node
    echo Using Node.js from system PATH
) else (
    :: Try the hardcoded path from the previous script
    if exist "C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe" (
        set NODE_EXE=C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe
        echo Using Node.js from: !NODE_EXE!
    ) else (
        echo ERROR: Node.js not found in PATH or expected location.
        echo Please install Node.js or update this script with the correct path.
        pause
        exit /b 1
    )
)

:: Display Node.js version
echo Node.js version:
"!NODE_EXE!" -v
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to run Node.js. Check if it's installed correctly.
    pause
    exit /b 1
)

:: Install dependencies
echo.
echo Installing dependencies...
if exist "C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\npm.cmd" (
    "C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\npm.cmd" install express cors youtube-transcript compression helmet express-rate-limit
) else (
    npm install express cors youtube-transcript compression helmet express-rate-limit
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

:: Get local IP address for easier access on local network
echo.
echo Network information:
ipconfig | findstr /i "IPv4"
echo.
echo =================================================
echo Server is about to start with the following URLs:
echo.
echo Local access: http://localhost:8080
echo Network access: http://YOUR-IP-ABOVE:8080
echo =================================================
echo.
echo Press CTRL+C to stop the server when finished.
echo.

:: Run the server
echo Starting server...
"!NODE_EXE!" --trace-warnings server-direct.js

:: If we get here, the server has terminated
echo.
echo Server has stopped.
pause 