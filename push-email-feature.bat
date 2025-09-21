@echo off
echo Pushing email collection and package code email feature...
echo.
echo This update adds:
echo - Email collection before payment
echo - Automatic email with package code
echo - Better user experience - no more lost codes!
echo.
git add netlify/functions/create-payment.js
git add netlify/functions/stripe-webhook.js
git add booking-system-v2.js
git commit -m "Feature: Add email collection and automatic package code sending

- Customers now enter email before payment
- Package code is automatically emailed after purchase
- Email is pre-filled in Stripe payment form
- Beautiful HTML email template with clear instructions
- Prevents lost package codes and improves UX"
git push
echo.
echo Feature deployed! Customers will now:
echo 1. Enter email before payment
echo 2. Receive package code via email automatically
echo 3. Never lose their codes again!
pause