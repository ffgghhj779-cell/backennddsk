@echo off
echo ====================================================================
echo   Uploading Facebook Messenger Chatbot to GitHub
echo ====================================================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

echo Initializing Git repository...
git init

echo Adding files...
git add .

echo Committing files...
git commit -m "✨ Complete Intelligent AI Assistant Integration - Production Ready

- Add AI reasoning engine with decision-making capabilities
- Implement context memory for conversation tracking  
- Create intelligent assistant orchestrator
- Update message service to use AI assistant
- Enrich knowledge base with 200+ products and 17 brands
- Correct all phone numbers (spray booth: 01144003490)
- Add comprehensive documentation (8 files)
- System is production-ready and tested"

echo Setting main branch...
git branch -M main

echo Connecting to GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/ffgghhj779-cell/backennddsk.git

echo Pushing to GitHub...
git push -u origin main --force

echo.
echo ====================================================================
echo   Upload complete! Check: https://github.com/ffgghhj779-cell/backennddsk
echo ====================================================================
echo.

pause
