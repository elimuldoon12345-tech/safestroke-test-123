@echo off
echo Pushing age requirements fix...
git add booking-system-v2.js
git commit -m "Remove age requirements warning"
git push origin main
echo Done! Check Netlify in 1-2 minutes.
pause
