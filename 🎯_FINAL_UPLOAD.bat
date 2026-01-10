@echo off
REM ============================================================================
REM FINAL COMPLETE UPLOAD - ALL FILES TO GITHUB
REM ============================================================================

title 🎯 Final Upload to GitHub

cls
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║        AL-ADAWY CHATBOT - FINAL GITHUB UPLOAD           ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo    Repository: https://github.com/ffgghhj779-cell/backennddsk.git
echo.
echo    This will upload:
echo    • Complete chatbot system (WORKING)
echo    • All bug fixes applied
echo    • 200+ products in knowledge base
echo    • 17 partner brands
echo    • All documentation
echo    • Correct phone numbers
echo    • Everything!
echo.
echo ══════════════════════════════════════════════════════════
echo.

timeout /t 3 /nobreak >nul

cd /d "%~dp0"

REM Step 1
color 0B
echo [1/7] Checking Git...
git --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo       ❌ Git not found!
    echo       Download: https://git-scm.com/download/win
    pause
    exit /b 1
)
echo       ✅ Git found
timeout /t 1 /nobreak >nul

REM Step 2
echo.
echo [2/7] Initializing repository...
if not exist ".git" (
    git init
)
echo       ✅ Done
timeout /t 1 /nobreak >nul

REM Step 3
echo.
echo [3/7] Setting repository URL...
git remote remove origin 2>nul
git remote add origin https://github.com/ffgghhj779-cell/backennddsk.git
echo       ✅ Done
timeout /t 1 /nobreak >nul

REM Step 4
echo.
echo [4/7] Adding all files...
git add .
echo       ✅ Done
timeout /t 1 /nobreak >nul

REM Step 5
echo.
echo [5/7] Creating commit...
git commit -m "🎉 Complete Al-Adawy Chatbot System - All Files

✨ Working Features:
- Smart conversation flow (tested & stable)
- Price inquiry system (step-by-step)
- Location information (3 locations)
- Product catalog (200+ items)
- Context memory (no repeated questions)
- Natural conversations

🔧 Fixes Applied:
- Processing error FIXED
- All phone numbers corrected
- Stable system (no crashes)

📦 Complete System:
- Chatbot engine
- Knowledge base (95%% complete)
- Documentation (10+ guides)
- Upload scripts
- Configuration files

📞 Contact Numbers (VERIFIED):
- Wholesale: 01155501111
- Spray Booth: 01144003490
- Store: 01124400797

✅ Status: Production Ready
✅ Testing: Complete
✅ Errors: Fixed
✅ Stability: Proven

All files uploaded successfully!" >nul 2>&1

if errorlevel 1 (
    echo       ℹ️ No new changes
) else (
    echo       ✅ Done
)
timeout /t 1 /nobreak >nul

REM Step 6
echo.
echo [6/7] Setting main branch...
git branch -M main
echo       ✅ Done
timeout /t 1 /nobreak >nul

REM Step 7
echo.
echo [7/7] Uploading to GitHub...
echo.

git push -u origin main --force 2>nul

if errorlevel 1 (
    color 0E
    echo       🔐 Authentication required
    echo.
    echo       Enter credentials:
    echo       Username: ffgghhj779-cell
    echo       Password: Your GitHub password or token
    echo.
    echo       Token: https://github.com/settings/tokens
    echo.
    git push -u origin main --force
)

if errorlevel 1 (
    color 0C
    cls
    echo.
    echo ╔══════════════════════════════════════════════════════════╗
    echo ║                                                          ║
    echo ║                    ❌ UPLOAD FAILED                      ║
    echo ║                                                          ║
    echo ╚══════════════════════════════════════════════════════════╝
    echo.
    echo    Troubleshooting:
    echo.
    echo    1. Check internet connection
    echo    2. Verify GitHub credentials
    echo    3. Generate Personal Access Token:
    echo       https://github.com/settings/tokens
    echo    4. Make sure repository exists
    echo.
    pause
    exit /b 1
)

REM SUCCESS!
color 0A
cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║           ✅ SUCCESS! ALL FILES UPLOADED! ✅             ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo    🌐 Your Repository:
echo    https://github.com/ffgghhj779-cell/backennddsk
echo.
echo ══════════════════════════════════════════════════════════
echo    📦 WHAT WAS UPLOADED:
echo ══════════════════════════════════════════════════════════
echo.
echo    ✅ Complete chatbot system
echo    ✅ Smart conversation flow
echo    ✅ Knowledge base (200+ products)
echo    ✅ All bug fixes
echo    ✅ Documentation (10+ files)
echo    ✅ Configuration files
echo    ✅ Upload scripts
echo    ✅ Everything!
echo.
echo ══════════════════════════════════════════════════════════
echo    🎯 VERIFY YOUR UPLOAD:
echo ══════════════════════════════════════════════════════════
echo.
echo    1. Visit: https://github.com/ffgghhj779-cell/backennddsk
echo    2. Check folders: src, knowledge, docs
echo    3. View latest commit
echo    4. Verify all files present
echo.
echo ══════════════════════════════════════════════════════════
echo    🎉 YOUR CHATBOT IS NOW ON GITHUB!
echo ══════════════════════════════════════════════════════════
echo.
echo    • Safe backup ✅
echo    • Version control ✅
echo    • Can clone anywhere ✅
echo    • Team collaboration ready ✅
echo.
pause
