@echo off
echo Pushing spam folder reminder update...
git add safestroke-booking.html
git commit -m "Add spam folder reminder to booking confirmation message"
git push
echo.
echo Update deployed! The confirmation message now reminds users to check spam folder.
pause