@echo off
chcp 65001 > nul 2>&1
setlocal EnableDelayedExpansion

echo.
echo  +--------------------------------------+
echo  ^|        Ren3D -- Build Tool           ^|
echo  +--------------------------------------+
echo.

node -v > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Download: https://nodejs.org
    echo.
    pause & exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  Node.js: %NODE_VER%
echo.

if not exist node_modules (
    echo  [INFO] Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 ( echo. & echo  [ERROR] npm install failed. & pause & exit /b 1 )
    echo.
)

echo  What do you want to do?
echo.
echo    1  -  Build Windows .exe  (installer + portable)
echo    2  -  Build Windows .exe  (NSIS installer only)
echo    3  -  Build Windows .exe  (Portable only)
echo    4  -  Run in dev mode     (test app without building)
echo.
echo    For Linux builds (.deb / AppImage):
echo    Use WSL2 or a Linux machine and run build.sh
echo.
echo    0  -  Exit
echo.

set /p CHOICE="  Enter number [0-4]: "

if "%CHOICE%"=="1" goto WIN_ALL
if "%CHOICE%"=="2" goto WIN_NSIS
if "%CHOICE%"=="3" goto WIN_PORT
if "%CHOICE%"=="4" goto DEV
if "%CHOICE%"=="0" exit /b 0

echo.
echo  [ERROR] Invalid choice: %CHOICE%
pause & exit /b 1

:WIN_ALL
echo.
echo  [BUILD] Windows x64 - installer + portable...
echo.
call npx electron-builder --win --config electron-builder.config.js
goto DONE

:WIN_NSIS
echo.
echo  [BUILD] Windows x64 - NSIS installer...
echo.
call npx electron-builder --win nsis --x64 --config electron-builder.config.js
goto DONE

:WIN_PORT
echo.
echo  [BUILD] Windows x64 - Portable .exe...
echo.
call npx electron-builder --win portable --x64 --config electron-builder.config.js
goto DONE

:DEV
echo.
echo  [DEV] Starting Electron (press Ctrl+C to stop)...
echo.
call npx electron .
exit /b 0

:DONE
echo.
if errorlevel 1 (
    echo  [ERROR] Build failed. See output above.
) else (
    echo  [OK] Done! Files saved to dist\
    echo.
    if exist dist ( dir dist /b & echo. & start explorer dist )
)
pause
