const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Admin function to create test packages for development/testing
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

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
    const { program, lessons, customerEmail, adminKey } = JSON.parse(event.body || '{}');

    // Simple admin authentication - in production, use proper auth
    if (adminKey !== 'safestroke-admin-2025') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Validate inputs
    if (!program || !lessons) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Program and lessons are required' }),
      };
    }

    // Define pricing
    const pricing = {
      'Droplet': { 4: 112, 6: 162, 8: 200 },
      'Splashlet': { 4: 152, 6: 222, 8: 280 },
      'Strokelet': { 4: 172, 6: 252, 8: 320 }
    };

    const price = pricing[program]?.[lessons];
    if (!price) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid program or lesson count' }),
      };
    }

    // Generate package code
    const prefix = program.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `TEST-${prefix}-${lessons}L-${timestamp}-${random}`;

    // Create package in database
    const { data: packageData, error } = await supabase
      .from('packages')
      .insert([
        {
          code: code,
          program: program,
          lessons_total: lessons,
          lessons_remaining: lessons,
          amount_paid: price,
          payment_intent_id: `test_${Date.now()}`,
          customer_email: customerEmail || 'test@safestroke.com',
          customer_name: 'Test Customer',
          status: 'paid', // Mark as paid for testing
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to create test package',
          details: error.message 
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        package: {
          code: code,
          program: program,
          lessons: lessons,
          price: price,
          status: 'paid'
        },
        message: `Test package created successfully. Use code "${code}" to book lessons.`
      }),
    };

  } catch (error) {
    console.error('Create test package error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
    };
  }
};