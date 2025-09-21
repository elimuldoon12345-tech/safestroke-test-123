@echo off
echo Pushing email program fix...
git add netlify/functions/email-service.js
git commit -m "Fix: Use lesson_type instead of program in email confirmations"
git push
echo.
echo Fix deployed! Email confirmations should now show the correct program name.
pause