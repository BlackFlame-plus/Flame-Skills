@echo off
echo ========================================
echo   Lanhu MCP Server Starter
echo ========================================
echo.

set "PROJECT_DIR=%~dp0..\..\mcp\lanhu-mcp"
cd /d "%PROJECT_DIR%"

echo [1/3 Checking port 8000...
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo [WARN Port 8000 is already in use!
    echo.
    netstat -ano | findstr :8000
    echo.
    choice /c YN /m "Kill existing process and restart?"
    if errorlevel 2 exit /b 0
    if errorlevel 1 (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
            taskkill /F /PID %%a >nul 2>&1
            echo Killed PID %%a
        )
        timeout /t 2 /nobreak >nul
    )
)

echo.
echo [2/3] Starting Lanhu MCP Server...
echo Service URL: http://localhost:8000/mcp
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

python lanhu_mcp_server.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR Server failed to start!
    echo.
    echo Troubleshooting:
    echo   1. Check Python version (3.10+ required: python --version
    echo   2. Check if dependencies installed: pip install -r requirements.txt
    echo   3. Check if .env file exists and LANHU_COOKIE is configured
    echo.
    pause
)
