@echo off
echo SafeStroke Booking System Setup
echo ================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo X npm is not installed. Please install Node.js first.
    echo   Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo OK npm found
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

echo.
echo OK Dependencies installed
echo.

REM Check if .env file exists
if not exist .env (
    echo X .env file not found!
    echo   Please make sure your .env file contains all necessary API keys
    pause
    exit /b 1
)

echo OK .env file found
echo.

REM Instructions for Supabase setup
echo ========================================
echo NEXT STEPS:
echo ========================================
echo.
echo 1. Go to your Supabase project SQL Editor:
echo    https://supabase.com/dashboard/project/eaifexutbngjmnxxwbob/sql
echo.
echo 2. Copy the contents of database-schema.sql and run it
echo.
echo 3. Set up Stripe webhook for production:
echo    - Go to https://dashboard.stripe.com/webhooks
echo    - Add endpoint: https://your-site.netlify.app/.netlify/functions/stripe-webhook
echo    - Select events: payment_intent.succeeded, payment_intent.payment_failed
echo    - Copy webhook secret and add to .env as STRIPE_WEBHOOK_SECRET
echo.
echo 4. Deploy to Netlify:
echo    - Push to GitHub
echo    - Netlify will auto-deploy
echo    - Add environment variables in Netlify dashboard
echo.
echo 5. Test the booking flow!
echo.
echo OK Setup complete!
echo.
pause
