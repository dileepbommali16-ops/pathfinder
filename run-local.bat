@echo off
title Pathfinder 2.0 Local Runner
echo ==============================================================================
echo Starting Pathfinder 2.0 Local Development Environment (Boss Mode)
echo ==============================================================================
echo [1/2] Launching Backend Server on http://localhost:8000 ...
start "Pathfinder Backend (FastAPI)" cmd /k "python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Frontend Client on http://localhost:5173 ...
start "Pathfinder Frontend (Vite React)" cmd /k "npx vite"

echo ==============================================================================
echo Both servers are starting!
echo Open your browser to: http://localhost:5173
echo ==============================================================================
