@echo off
echo Pushing website content corrections...
git add index.html
git commit -m "Fix: Correct email address and remove outdated claims"
git push
echo.
echo Updates deployed! 
echo - Email changed to contact@safestrokeswim.com
echo - Removed 'since 2015' reference
echo - Removed '3000+ families' claim
pause