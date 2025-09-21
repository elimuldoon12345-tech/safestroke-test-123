const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Mapping of programs to Acuity appointment type IDs
const ACUITY_APPOINTMENT_TYPE_IDS = {
  'Droplet': 81908979,
  'Splashlet': 81908997,
  'Strokelet': 81909020,
};

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const code = event.queryStringParameters?.code;

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Package code is required' }),
      };
    }

    // Look up the package in the database
    const { data: packageData, error } = await supabase
      .from('packages')
      .select('*')
      .eq('code', code)
      .eq('status', 'paid') // Only allow paid packages
      .single();

    if (error || !packageData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired package code' 
        }),
      };
    }

    // Check if package has remaining lessons
    if (packageData.lessons_remaining <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          error: 'This package has no remaining lessons' 
        }),
      };
    }

    // Get customer information if available
    let customer = null;
    if (packageData.customer_email) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('email', packageData.customer_email)
        .single();
      
      customer = customerData;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        program: packageData.program,
        lessons_total: packageData.lessons_total,
        lessons_remaining: packageData.lessons_remaining,
        appointmentTypeID: ACUITY_APPOINTMENT_TYPE_IDS[packageData.program],
        customer: customer,
      }),
    };

  } catch (error) {
    console.error('Package validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        valid: false,
        error: 'Failed to validate package code' 
      }),
    };
  }
};