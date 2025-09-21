@echo off
echo Connecting to existing GitHub repository...

REM First, let's check current remote
git remote -v

echo.
echo If you want to connect to your existing GitHub repo, run:
echo git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
echo.
echo Or if no remote exists:
echo git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
echo.
echo Then push your working version:
echo git push -u origin main
echo.
pause