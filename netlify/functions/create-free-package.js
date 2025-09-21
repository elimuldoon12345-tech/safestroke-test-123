const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('DEBUG: create-free-package called');
    console.log('DEBUG: event.body:', event.body);

    const { program, promoCode } = JSON.parse(event.body);

    console.log('DEBUG: Parsed data - program:', program, 'promoCode:', promoCode);

    // Validate inputs
    if (!program || !promoCode) {
      console.log('DEBUG: Missing required fields - program:', program, 'promoCode:', promoCode);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Generate a unique package code for free lesson
    const packageCode = `FREE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    console.log('DEBUG: Generated package code:', packageCode);

    // Create the free package
    console.log('DEBUG: Attempting to insert into packages table');
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([
        {
          code: packageCode,
          program: program,
          lessons_total: 1,
          lessons_remaining: 1,
          amount_paid: 0,
          payment_intent_id: `promo_${promoCode}`,
          status: 'paid',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    console.log('DEBUG: Database operation result - data:', packageData, 'error:', packageError);

    if (packageError) {
      console.error('Package creation error:', packageError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to create free package',
          details: packageError.message
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        packageCode: packageCode,
        message: 'Free lesson package created successfully'
      }),
    };

  } catch (error) {
    console.error('Create free package error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create free package',
        details: error.message 
      }),
    };
  }
};