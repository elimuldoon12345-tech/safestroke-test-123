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
    console.log('DEBUG: create-free-admin-package called');
    console.log('DEBUG: event.body:', event.body);

    const { program, lessons, customerEmail, promoCode } = JSON.parse(event.body);

    console.log('DEBUG: Parsed data:', { program, lessons, customerEmail, promoCode });

    // Validate inputs
    if (!program || !lessons || !customerEmail || !promoCode) {
      console.log('DEBUG: Missing required fields');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Verify admin promo code
    if (promoCode.toLowerCase() !== 'admin') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid promo code for free package' }),
      };
    }

    // Generate a unique package code for admin free package
    const packageCode = `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    console.log('DEBUG: Generated package code:', packageCode);

    // Create the free package
    console.log('DEBUG: Attempting to insert into packages table');
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([
        {
          code: packageCode,
          program: program,
          lessons_total: lessons,
          lessons_remaining: lessons,
          amount_paid: 0,
          status: 'paid' // Mark as paid even though it's free
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
          error: 'Failed to create admin free package',
          details: packageError.message
        }),
      };
    }

    // Update or create customer record
    const { error: customerError } = await supabase
      .from('customers')
      .upsert([
        {
          email: customerEmail,
          name: 'Admin Package Customer',
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'email' });

    if (customerError) {
      console.error('Customer upsert error:', customerError);
      // Non-critical, continue
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        packageCode: packageCode,
        message: 'Admin free package created successfully'
      }),
    };

  } catch (error) {
    console.error('Create admin free package error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create admin free package',
        details: error.message
      }),
    };
  }
};