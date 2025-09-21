@echo off
echo =============================================
echo   Git Repository Fix Script
echo =============================================
echo.
echo This script will help fix your Git repository issues.
echo.
echo Choose an option:
echo 1. Check current Git status
echo 2. Quick commit and push changes
echo 3. Fix remote URL (if pointing to wrong repo)
echo 4. Complete re-initialization (WARNING: resets history)
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto checkstatus
if "%choice%"=="2" goto quickpush
if "%choice%"=="3" goto fixremote
if "%choice%"=="4" goto reinit
if "%choice%"=="5" goto end

:checkstatus
echo.
echo Checking Git Status...
echo -------------------------
echo Current Directory:
cd
echo.
echo Remote Repository:
git remote -v
echo.
echo Current Branch:
git branch
echo.
echo File Status:
git status
echo.
pause
goto end

:quickpush
echo.
echo Quick Push to GitHub...
echo -------------------------
git add .
set /p msg="Enter commit message: "
if "%msg%"=="" set msg=Update website files
git commit -m "%msg%"
git push origin main
echo.
echo Done! Changes pushed to GitHub.
pause
goto end

:fixremote
echo.
echo Fixing Remote URL...
echo -------------------------
echo Current remote:
git remote -v
echo.
echo Removing old remote...
git remote remove origin
echo.
echo Adding correct remote...
git remote add origin https://github.com/elimuldoon12345-tech/safestroke-website.git
echo.
echo New remote:
git remote -v
echo.
echo Remote URL fixed!
pause
goto end

:reinit
echo.
echo WARNING: This will reset your Git history!
set /p confirm="Are you sure? (yes/no): "
if /i not "%confirm%"=="yes" goto end
echo.
echo Re-initializing repository...
echo -------------------------
rd /s /q .git
git init
git remote add origin https://github.com/elimuldoon12345-tech/safestroke-website.git
git add .
git commit -m "Reinitialize repository with all current files"
git branch -M main
echo.
echo Pushing to GitHub (may need credentials)...
git push -u origin main --force
echo.
echo Repository reinitialized!
pause
goto end

:end
echo.
echo Exiting...
