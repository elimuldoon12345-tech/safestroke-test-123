@echo off
echo =============================================
echo   Git Repository Re-initialization Script
echo =============================================
echo.
echo This script will reinitialize your Git repository
echo to ensure everything is properly configured.
echo.
echo WARNING: This will preserve your files but reset Git history!
echo.
set /p confirm="Are you sure you want to continue? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Operation cancelled.
    pause
    exit
)

echo.
echo Step 1: Backing up current .git folder...
if exist .git (
    rename .git .git-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
    echo Backup created.
) else (
    echo No existing .git folder found.
)

echo.
echo Step 2: Initializing new Git repository...
git init

echo.
echo Step 3: Adding remote origin...
git remote add origin https://github.com/elimuldoon12345-tech/safestroke-website.git

echo.
echo Step 4: Adding all files...
git add .

echo.
echo Step 5: Creating initial commit...
git commit -m "Reinitialize repository with all current files"

echo.
echo Step 6: Setting main branch...
git branch -M main

echo.
echo Step 7: Pushing to GitHub (you may need to enter credentials)...
git push -u origin main --force

echo.
echo =============================================
echo   Repository reinitialized successfully!
echo =============================================
echo.
echo Your files are now properly tracked in Git.
echo The repository is connected to GitHub.
echo.
pause
