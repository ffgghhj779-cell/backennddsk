@echo off
echo ====================================================================
echo   Uploading Facebook Messenger Chatbot to GitHub
echo ====================================================================
echo.

cd /d "C:\Users\lenovo\Desktop\projjeect"

echo Initializing Git repository...
git init

echo Adding files...
git add .

echo Committing files...
git commit -m "Initial commit: Facebook Messenger Chatbot with OpenAI"

echo Setting main branch...
git branch -M main

echo Connecting to GitHub...
git remote add origin https://github.com/osamakhalil740-ops/backennddsk.git

echo Pushing to GitHub...
git push -u origin main --force

echo.
echo ====================================================================
echo   Upload complete! Check: https://github.com/osamakhalil740-ops/backennddsk
echo ====================================================================
echo.

pause
