@echo off
echo === Checking Git Status for Both Folders ===
echo.

echo [1] NEW FOLDER (Working Version):
echo ---------------------------------
cd "C:\Users\eli\Desktop\New folder"
git remote -v
git status
echo.

echo [2] SAFESTROKE-WEBSITE (Broken Version):
echo ---------------------------------------
cd "C:\Users\eli\Desktop\safestroke-website"
git remote -v
git status
echo.

pause