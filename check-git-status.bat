@echo off
echo Checking Git Status...
echo.
echo Current Directory:
cd
echo.
echo Git Remote:
git remote -v
echo.
echo Git Status:
git status
echo.
echo Git Branch:
git branch
echo.
echo Recent Commits:
git log --oneline -5
echo.
pause
