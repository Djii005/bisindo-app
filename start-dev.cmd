@echo off
setlocal

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "FRONTEND_DIR=%ROOT_DIR%"
set "BACKEND_DIR=%ROOT_DIR%\server"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm tidak ditemukan. Install Node.js terlebih dahulu.
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] package.json frontend tidak ditemukan di:
  echo         %FRONTEND_DIR%
  exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] package.json backend tidak ditemukan di:
  echo         %BACKEND_DIR%
  exit /b 1
)

echo Menjalankan BISINDO frontend dan backend...
echo.
echo Frontend: http://localhost:5173
echo Backend : http://localhost:3001
echo.

start "BISINDO Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && npm run dev"
start "BISINDO Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo Dua jendela cmd sudah dibuka.
echo Tutup masing-masing server dengan Ctrl + C pada jendela terkait.

endlocal
