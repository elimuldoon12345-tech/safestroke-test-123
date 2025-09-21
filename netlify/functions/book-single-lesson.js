const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const {
      program,
      price,
      timeSlotId,
      studentName,
      studentAge,
      customerName,
      customerEmail,
      customerPhone
    } = JSON.parse(event.body);

    // Validate inputs
    if (!program || !timeSlotId || !studentName || !customerName || !customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Generate a unique package code for single lesson
    const packageCode = `SINGLE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        packageCode: packageCode,
        program: program,
        customerEmail: customerEmail,
        timeSlotId: timeSlotId
      }
    });

    // Create the single lesson package in database
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([
        {
          code: packageCode,
          program: program,
          lessons_total: 1,
          lessons_remaining: 1,
          amount_paid: price,
          payment_intent_id: paymentIntent.id,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          status: 'pending', // Will be updated to 'paid' after payment confirmation
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (packageError) {
      console.error('Package creation error:', packageError);
      // Cancel the payment intent if package creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create booking' }),
      };
    }

    // Store booking details temporarily (will be confirmed after payment)
    const { error: bookingError } = await supabase
      .from('temp_bookings')
      .insert([
        {
          package_code: packageCode,
          time_slot_id: timeSlotId,
          student_name: studentName,
          student_age: studentAge,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          created_at: new Date().toISOString()
        }
      ]);

    // If temp_bookings table doesn't exist, that's okay - we can still proceed
    if (bookingError) {
      console.log('Note: temp_bookings table may not exist, continuing...');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        packageCode: packageCode,
        message: 'Payment intent created successfully'
      }),
    };

  } catch (error) {
    console.error('Single lesson booking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process single lesson booking',
        details: error.message 
      }),
    };
  }
};