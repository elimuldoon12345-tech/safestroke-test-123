#!/bin/bash

echo "SafeStroke Booking System Setup"
echo "================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ npm found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Please make sure your .env file contains all necessary API keys"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Instructions for Supabase setup
echo "📋 Next Steps:"
echo ""
echo "1. Go to your Supabase project:"
echo "   https://supabase.com/dashboard/project/eaifexutbngjmnxxwbob/sql"
echo ""
echo "2. Copy the contents of database-schema.sql and run it in the SQL editor"
echo ""
echo "3. Set up Stripe webhook (for production):"
echo "   - Go to https://dashboard.stripe.com/webhooks"
echo "   - Add endpoint: https://your-site.netlify.app/.netlify/functions/stripe-webhook"
echo "   - Select events: payment_intent.succeeded, payment_intent.payment_failed"
echo "   - Copy the webhook secret and add to .env as STRIPE_WEBHOOK_SECRET"
echo ""
echo "4. Deploy to Netlify:"
echo "   - Push to GitHub"
echo "   - Netlify will auto-deploy"
echo "   - Add environment variables in Netlify dashboard"
echo ""
echo "5. Test the booking flow!"
echo ""
echo "✅ Setup complete!"
