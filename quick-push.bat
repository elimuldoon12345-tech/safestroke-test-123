@echo off
echo =============================================
echo   Quick Git Push Script
echo =============================================
echo.
echo This will commit and push all your changes to GitHub.
echo.

echo Current Status:
git status
echo.

set /p message="Enter commit message (or press Enter for default): "
if "%message%"=="" set message=Update website files

echo.
echo Adding all changes...
git add .

echo.
echo Committing with message: "%message%"
git commit -m "%message%"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo =============================================
echo   Done! Changes pushed to GitHub.
echo =============================================
echo.
echo Your changes should be live on Netlify in 1-2 minutes.
echo.
pause
