@echo off
rem Build FaceLens.exe (dist\FaceLens\) and, if Inno Setup 6 is installed, FaceLens-Setup.exe.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    where py >nul 2>nul && (py -3.12 -m venv .venv || py -3 -m venv .venv) || python -m venv .venv
)
set PY=.venv\Scripts\python.exe
if not exist "%PY%" (
    echo Python 3.10-3.12 ^(64-bit^) is needed: https://www.python.org/downloads/windows/
    exit /b 1
)

"%PY%" -m pip install --upgrade pip || exit /b 1
"%PY%" -m pip install -r requirements.txt -r requirements-insightface.txt pyinstaller || exit /b 1
rem --no-deps: InsightFace asks for opencv-python, which would replace DeepFace's OpenCV build.
"%PY%" -m pip install --no-deps insightface==2.1 || exit /b 1
"%PY%" -m PyInstaller --noconfirm --clean facelens.spec || exit /b 1
echo.
echo Built: %CD%\dist\FaceLens\FaceLens.exe

set ISCC=
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe
if defined ISCC (
    "%ISCC%" installer.iss || exit /b 1
    echo Installer: %CD%\dist\FaceLens-Setup.exe
) else (
    echo Inno Setup 6 not found - skipping the installer. Get it from https://jrsoftware.org/isdl.php
)
