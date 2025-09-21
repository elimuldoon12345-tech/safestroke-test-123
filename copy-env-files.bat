@echo off
echo Copying important files from broken to working folder...

REM Copy .env file
copy "C:\Users\eli\Desktop\safestroke-website\.env" "C:\Users\eli\Desktop\New folder\.env"
echo Copied .env file

REM Copy .gitignore if it doesn't exist
if not exist "C:\Users\eli\Desktop\New folder\.gitignore" (
    copy "C:\Users\eli\Desktop\safestroke-website\.gitignore" "C:\Users\eli\Desktop\New folder\.gitignore"
    echo Copied .gitignore file
)

echo.
echo Important files copied!
pause