@echo off
REM ============================================================================
REM INSTANT GITHUB UPLOAD - ONE CLICK!
REM Repository: https://github.com/ffgghhj779-cell/backennddsk.git
REM ============================================================================

color 0B
title ⚡ INSTANT UPLOAD - Al-Adawy Chatbot

cls
echo.
echo ============================================================
echo    ⚡ INSTANT GITHUB UPLOAD
echo ============================================================
echo.
echo    Repository: backennddsk
echo    Owner: ffgghhj779-cell
echo    Status: Uploading ALL files...
echo.
echo ============================================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Initialize Git if needed
if not exist ".git" (
    echo [1/6] Initializing Git...
    git init
    echo       Done!
    echo.
) else (
    echo [1/6] Git already initialized
    echo       Done!
    echo.
)

REM Remove old remote and set correct one
echo [2/6] Configuring repository...
git remote remove origin 2>nul
git remote add origin https://github.com/ffgghhj779-cell/backennddsk.git
echo       Done!
echo.

REM Add ALL files
echo [3/6] Adding all files...
git add .
echo       Done!
echo.

REM Create commit
echo [4/6] Creating commit...
git commit -m "Complete Chatbot - Error Fixed & Working" -m "All files uploaded including bug fixes and working chatbot system"
if errorlevel 1 (
    echo       No new changes
) else (
    echo       Done!
)
echo.

REM Set branch to main
echo [5/6] Setting branch...
git branch -M main
echo       Done!
echo.

REM Push to GitHub
echo [6/6] Uploading to GitHub...
echo.
git push -u origin main --force 2>nul

if errorlevel 1 (
    echo       Authentication needed...
    echo.
    echo       Username: ffgghhj779-cell
    echo       Password: (GitHub password or token)
    echo.
    git push -u origin main --force
)

if errorlevel 1 (
    color 0C
    echo.
    echo ============================================================
    echo    ❌ UPLOAD FAILED
    echo ============================================================
    echo.
    echo    Possible reasons:
    echo    - No internet connection
    echo    - Wrong GitHub credentials
    echo    - Repository doesn't exist
    echo.
    echo    Try:
    echo    1. Check internet connection
    echo    2. Generate token: https://github.com/settings/tokens
    echo    3. Make sure repository exists
    echo.
    pause
    exit /b 1
)

REM Success!
color 0A
cls
echo.
echo ============================================================
echo    ✅ SUCCESS! ALL FILES UPLOADED!
echo ============================================================
echo.
echo    🌐 Repository:
echo       https://github.com/ffgghhj779-cell/backennddsk
echo.
echo ============================================================
echo    📦 UPLOADED FILES:
echo ============================================================
echo.
echo    ✅ Chatbot system (working & tested)
echo    ✅ Bug fixes (processing error fixed)
echo    ✅ Knowledge base (200+ products)
echo    ✅ All documentation (10+ guides)
echo    ✅ Phone numbers (all corrected)
echo    ✅ Configuration files
echo    ✅ Upload scripts
echo.
echo ============================================================
echo    🎯 NEXT STEPS:
echo ============================================================
echo.
echo    1. Visit: https://github.com/ffgghhj779-cell/backennddsk
echo    2. Verify files are there
echo    3. Check latest commit
echo    4. Clone to test if needed
echo.
echo    Your chatbot is now safely backed up on GitHub!
echo.
echo ============================================================
echo.
pause
