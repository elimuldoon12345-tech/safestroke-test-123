const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      node_version: process.version,
      netlify: !!process.env.NETLIFY,
      site_name: process.env.SITE_NAME || 'unknown'
    },
    services: {},
    database: {},
    summary: {
      ready: false,
      issues: []
    }
  };

  // Test Stripe connection
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    const balance = await stripe.balance.retrieve();
    results.services.stripe = {
      connected: true,
      mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'test' : 'live',
      currency: balance.available[0]?.currency || 'usd'
    };
  } catch (error) {
    results.services.stripe = {
      connected: false,
      error: error.message
    };
    results.summary.issues.push('Stripe connection failed');
  }

  // Test Supabase connection
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Test database connection and get statistics
    const [packages, timeSlots, bookings] = await Promise.all([
      supabase.from('packages').select('*', { count: 'exact', head: true }),
      supabase.from('time_slots').select('*', { count: 'exact', head: true }),
      supabase.from('time_slot_bookings').select('*', { count: 'exact', head: true })
    ]);

    results.services.supabase = {
      connected: true,
      url: process.env.SUPABASE_URL
    };

    results.database = {
      packages: {
        total: packages.count || 0,
        error: packages.error?.message
      },
      time_slots: {
        total: timeSlots.count || 0,
        error: timeSlots.error?.message
      },
      bookings: {
        total: bookings.count || 0,
        error: bookings.error?.message
      }
    };

    // Get upcoming available slots
    const today = new Date().toISOString().split('T')[0];
    const { data: upcomingSlots, error: slotsError } = await supabase
      .from('time_slots')
      .select('date, lesson_type, start_time')
      .gte('date', today)
      .eq('status', 'available')
      .limit(5)
      .order('date', { ascending: true });

    if (!slotsError && upcomingSlots) {
      results.database.upcoming_slots = upcomingSlots.map(slot => ({
        date: slot.date,
        time: slot.start_time,
        type: slot.lesson_type
      }));
    }

  } catch (error) {
    results.services.supabase = {
      connected: false,
      error: error.message
    };
    results.summary.issues.push('Supabase connection failed');
  }

  // Check webhook configuration
  results.services.webhook = {
    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    endpoint: `${process.env.URL || 'https://your-site.netlify.app'}/.netlify/functions/stripe-webhook`
  };

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    results.summary.issues.push('Stripe webhook secret not configured');
  }

  // Determine overall readiness
  results.summary.ready = 
    results.services.stripe?.connected && 
    results.services.supabase?.connected &&
    results.services.webhook?.configured &&
    (results.database.time_slots?.total > 0);

  if (results.database.time_slots?.total === 0) {
    results.summary.issues.push('No time slots in database - run initialization');
  }

  // Add recommendations
  results.summary.recommendations = [];
  
  if (!results.summary.ready) {
    if (!results.services.stripe?.connected) {
      results.summary.recommendations.push('Configure STRIPE_SECRET_KEY in Netlify environment variables');
    }
    if (!results.services.supabase?.connected) {
      results.summary.recommendations.push('Configure SUPABASE_URL and SUPABASE_SERVICE_KEY in Netlify environment variables');
    }
    if (!results.services.webhook?.configured) {
      results.summary.recommendations.push('Set up Stripe webhook and add STRIPE_WEBHOOK_SECRET to environment variables');
    }
    if (results.database.time_slots?.total === 0) {
      results.summary.recommendations.push('Initialize time slots using admin dashboard or SQL script');
    }
  } else {
    results.summary.recommendations.push('System is ready for testing!');
    results.summary.recommendations.push('Use Stripe test card: 4242 4242 4242 4242');
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results, null, 2),
  };
};