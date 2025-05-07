@echo off
echo ========================================================
echo Preparing to run the transcription practice Node.js server
echo ========================================================
echo.
echo Current directory: %CD%
echo Node.js version:
"C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe" -v
echo.
echo Installing dependencies:
"C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\npm.cmd" install express cors youtube-transcript compression helmet express-rate-limit
echo.
echo Starting server with debug output:
"C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe" --trace-warnings server-direct.js
pause 