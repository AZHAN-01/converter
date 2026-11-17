@echo off
title Converter Server
echo ========================================================
echo                 Converter Local Server
echo ========================================================
echo.
echo Starting local web server...
echo.
start http://localhost:3000/
node "%~dp0server.js"
pause
