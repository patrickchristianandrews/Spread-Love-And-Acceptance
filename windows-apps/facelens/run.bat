@echo off
rem Run FaceLens from source. The first run creates a private Python environment (.venv)
rem and installs DeepFace, TensorFlow and Qt into it (about 1.5 GB, a few minutes).
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python environment...
    where py >nul 2>nul && (py -3.12 -m venv .venv || py -3 -m venv .venv) || python -m venv .venv
    if not exist ".venv\Scripts\python.exe" (
        echo.
        echo Python 3.10-3.12 ^(64-bit^) is needed. Get it from https://www.python.org/downloads/windows/
        echo and tick "Add python.exe to PATH" during setup.
        pause
        exit /b 1
    )
    ".venv\Scripts\python.exe" -m pip install --upgrade pip
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt || (pause & exit /b 1)
    rem Optional InsightFace engine: --no-deps keeps DeepFace's OpenCV build in place.
    ".venv\Scripts\python.exe" -m pip install -r requirements-insightface.txt
    ".venv\Scripts\python.exe" -m pip install --no-deps insightface==2.1
)

start "" ".venv\Scripts\pythonw.exe" facelens.py
