@echo off
TITLE Gaussian Reality - Launch Manager
echo ================================================================
echo   GAUSSIAN REALITY
echo   3D Gaussian Splatting AR Viewer and Occlusion Engine
echo ================================================================
echo.

echo [1/3] Running Demo Asset Verification...
python scripts/setup_demo.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Demo setup failed. Check Python environment.
    pause
    exit /b 1
)
echo.

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Gaussian Reality - Backend (FastAPI)" powershell -NoExit -Command "cd backend; python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak > nul

echo [3/3] Starting Vite Frontend on http://127.0.0.1:5173 ...
start "Gaussian Reality - Frontend (Vite)" powershell -NoExit -Command "cd frontend; npm run dev -- --open"

echo.
echo ================================================================
echo   System running!
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8000/docs
echo ================================================================
echo.
pause
