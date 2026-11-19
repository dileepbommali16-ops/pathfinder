@echo off
title Pathfinder 2.0 - DAS AI Real Chrome, Gmail & VS Code Laptop Bridge
cd /d "%~dp0"
echo ======================================================================
echo   PATHFINDER 2.0 - LOCAL LAPTOP DESKTOP BRIDGE (REAL CHROME + GMAIL)
echo ======================================================================
echo.
if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" bridge_agent.py --open-chrome
) else (
    python bridge_agent.py --open-chrome
)
pause
