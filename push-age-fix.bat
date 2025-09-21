@echo off
echo =============================================
echo   Push Age Requirements Fix to GitHub
echo =============================================
echo.
echo This will push the fix that removes the
echo "Important: Age Requirements" warning.
echo.
echo Adding changes...
git add booking-system-v2.js

echo.
echo Committing the fix...
git commit -m "Remove age requirements warning from booking page"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo =============================================
echo   Fix deployed successfully!
echo =============================================
echo.
echo The age requirements warning will be removed.
echo.
echo Your changes will be live on Netlify in 1-2 minutes.
echo Remember to clear your browser cache (Ctrl+Shift+R)
echo.
pause
