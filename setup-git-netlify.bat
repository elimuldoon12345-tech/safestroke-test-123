@echo off
echo ======================================
echo Setting up Git and Netlify Connection
echo ======================================
echo.

echo Step 1: Initializing Git...
git init
echo.

echo Step 2: Adding all files...
git add .
echo.

echo Step 3: Creating commit...
git commit -m "Working version from Netlify rollback - stable baseline"
echo.

echo Step 4: Setting up remote...
echo.
echo Please enter your GitHub repository URL:
echo Example: https://github.com/username/repo-name.git
set /p REPO_URL="Repository URL: "
git remote add origin %REPO_URL%
echo.

echo Step 5: Pushing to GitHub (this will overwrite remote)...
echo WARNING: This will force push and overwrite what's on GitHub!
pause
git push --force origin main
echo.

echo Step 6: Connecting to Netlify...
netlify link
echo.

echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Your local folder is now connected to:
git remote -v
echo.
netlify status
echo.
pause