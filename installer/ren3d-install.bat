@echo off
chcp 65001 > nul 2>&1
setlocal EnableDelayedExpansion

set GITHUB_USER=MihailKashintsev
set GITHUB_REPO=ren3d
set API_URL=https://api.github.com/repos/%GITHUB_USER%/%GITHUB_REPO%/releases/latest

echo.
echo  +==========================================+
echo  ^|        Ren3D -- Windows Installer       ^|
echo  +==========================================+
echo.

REM Check PowerShell (used for downloads)
powershell -Command "exit 0" > nul 2>&1
if errorlevel 1 (
    echo  [ERROR] PowerShell not available.
    pause & exit /b 1
)

echo  [1/3] Checking latest release on GitHub...
echo.

REM Get latest release info via GitHub API
set TMP_JSON=%TEMP%\ren3d-release.json
powershell -Command "try { Invoke-WebRequest -Uri '%API_URL%' -OutFile '%TMP_JSON%' -UseBasicParsing } catch { exit 1 }"

if errorlevel 1 (
    echo  [ERROR] Cannot reach GitHub. Check internet connection.
    echo.
    echo  Repository: https://github.com/%GITHUB_USER%/%GITHUB_REPO%
    echo  Make sure it is PUBLIC and has at least one Release.
    echo.
    echo  To create a release:
    echo    1. Go to your repo on GitHub
    echo    2. Click "Releases" on the right side
    echo    3. Click "Create a new release"
    echo    4. Set tag: v2.0.0, click "Publish release"
    echo    5. Wait for GitHub Actions to attach .exe files
    echo    6. Run this installer again
    echo.
    pause & exit /b 1
)

REM Parse version and download URL from JSON
for /f "tokens=* usebackq" %%a in (`powershell -Command "try { $j = Get-Content '%TMP_JSON%' | ConvertFrom-Json; Write-Output $j.tag_name } catch { Write-Output 'ERROR' }"`) do set VERSION=%%a
for /f "tokens=* usebackq" %%a in (`powershell -Command "try { $j = Get-Content '%TMP_JSON%' | ConvertFrom-Json; $exe = $j.assets | Where-Object { $_.name -like '*Setup*.exe' -or $_.name -like '*installer*.exe' -or ($_.name -like '*.exe' -and $_.name -notlike '*portable*') } | Select-Object -First 1; Write-Output $exe.browser_download_url } catch { Write-Output 'ERROR' }"`) do set EXE_URL=%%a

del "%TMP_JSON%" 2>nul

if "%VERSION%"=="ERROR" (
    echo  [ERROR] Could not parse release info.
    pause & exit /b 1
)

if "%EXE_URL%"=="ERROR" (
    echo  [ERROR] No .exe found in latest release.
    echo.
    echo  Make sure GitHub Actions has finished building.
    echo  Check: https://github.com/%GITHUB_USER%/%GITHUB_REPO%/actions
    pause & exit /b 1
)

if "%EXE_URL%"=="" (
    echo  [WARN] No installer .exe found in release %VERSION%.
    echo  Trying to find any .exe...
    for /f "tokens=* usebackq" %%a in (`powershell -Command "try { $j = Get-Content '%TMP_JSON%' | ConvertFrom-Json; $exe = $j.assets | Where-Object { $_.name -like '*.exe' } | Select-Object -First 1; Write-Output $exe.browser_download_url } catch { Write-Output '' }"`) do set EXE_URL=%%a
)

if "%EXE_URL%"=="" (
    echo  [ERROR] No .exe found. Release may still be building.
    echo  Check: https://github.com/%GITHUB_USER%/%GITHUB_REPO%/releases
    pause & exit /b 1
)

echo  Version : %VERSION%
echo  File    : %EXE_URL%
echo.
echo  [2/3] Downloading installer...
echo.

set TMP_EXE=%TEMP%\ren3d-setup.exe
powershell -Command "try { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%EXE_URL%' -OutFile '%TMP_EXE%' -UseBasicParsing; Write-Host '  Download complete.' } catch { Write-Host '[ERROR]' $_.Exception.Message; exit 1 }"

if errorlevel 1 (
    echo  [ERROR] Download failed.
    pause & exit /b 1
)

if not exist "%TMP_EXE%" (
    echo  [ERROR] File not saved.
    pause & exit /b 1
)

echo.
echo  [3/3] Running installer...
echo.
echo  Follow the on-screen instructions to install Ren3D.
echo.

start /wait "" "%TMP_EXE%"
del "%TMP_EXE%" 2>nul

echo.
echo  +==========================================+
echo  ^|   Ren3D installed successfully!         ^|
echo  +==========================================+
echo.
echo  Launch from Start Menu or Desktop shortcut.
echo.
pause
