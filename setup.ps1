Write-Host "SafeStroke Booking System Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found (version $npmVersion)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ npm is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "   Visit: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Please make sure your .env file contains all necessary API keys" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Instructions for Supabase setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to your Supabase project SQL Editor:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/eaifexutbngjmnxxwbob/sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Copy the contents of database-schema.sql and run it" -ForegroundColor White
Write-Host ""
Write-Host "3. Set up Stripe webhook (for production):" -ForegroundColor White
Write-Host "   - Go to https://dashboard.stripe.com/webhooks" -ForegroundColor Gray
Write-Host "   - Add endpoint: https://your-site.netlify.app/.netlify/functions/stripe-webhook" -ForegroundColor Gray
Write-Host "   - Select events: payment_intent.succeeded, payment_intent.payment_failed" -ForegroundColor Gray
Write-Host "   - Copy webhook secret and add to .env as STRIPE_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Deploy to Netlify:" -ForegroundColor White
Write-Host "   - Push to GitHub" -ForegroundColor Gray
Write-Host "   - Netlify will auto-deploy" -ForegroundColor Gray
Write-Host "   - Add environment variables in Netlify dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Test the booking flow!" -ForegroundColor White
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
