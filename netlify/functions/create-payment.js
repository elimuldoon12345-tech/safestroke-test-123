const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // For GET requests - show status
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'Payment function is accessible',
        stripe_configured: !!process.env.STRIPE_SECRET_KEY,
        timestamp: new Date().toISOString()
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check if Stripe key exists
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Payment system not configured',
        details: 'STRIPE_SECRET_KEY missing'
      }),
    };
  }

  // Check if Supabase is configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Supabase not configured');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database not configured',
        details: 'Supabase credentials missing'
      }),
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request data',
          details: parseError.message 
        }),
      };
    }

    const { amount, program, lessons, customerEmail } = requestData;

    // Validate input
    if (!amount || !program || !lessons) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          details: 'amount, program, and lessons are required'
        }),
      };
    }
    
    // Email is optional but recommended
    if (customerEmail) {
      console.log('Email provided for package code delivery:', customerEmail);
    }

    console.log('Creating payment intent for:', { amount, program, lessons });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        program: program,
        lessons: lessons.toString(),
        customerEmail: customerEmail || '',
        packageCode: generatePackageCode(program, lessons), // Pre-generate so we have it
      },
      receipt_email: customerEmail || null,
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Use the package code from metadata
    const packageCode = paymentIntent.metadata.packageCode;

    // Determine if we're in test mode
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test');
    
    // Store the package in database
    // For TEST mode, set status to 'paid' immediately since webhook might not be configured
    const { error: dbError } = await supabase
      .from('packages')
      .insert([
        {
          code: packageCode,
          program: program,
          lessons_total: lessons,
          lessons_remaining: lessons,
          amount_paid: amount / 100, // Convert back to dollars
          payment_intent_id: paymentIntent.id,
          status: isTestMode ? 'paid' : 'pending', // Set to 'paid' in test mode
          customer_email: customerEmail || null,
          created_at: new Date().toISOString(),
        }
      ]);

    if (dbError) {
      console.error('Database error (non-fatal):', dbError);
      // Continue anyway - we can handle this manually if needed
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        packageCode: packageCode,
        testMode: isTestMode // Let frontend know if we're in test mode
      }),
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create payment intent',
        details: error.message,
        type: error.type || 'unknown'
      }),
    };
  }
};

function generatePackageCode(program, lessons) {
  const prefix = program.toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${lessons}L-${timestamp}-${random}`;
}