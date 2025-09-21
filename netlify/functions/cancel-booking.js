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
    console.log('DEBUG: cancel-booking called');
    console.log('DEBUG: event.body:', event.body);

    const { bookingId, customerEmail } = JSON.parse(event.body);

    console.log('DEBUG: Parsed data:', { bookingId, customerEmail });

    // Validate inputs
    if (!bookingId || !customerEmail) {
      console.log('DEBUG: Missing required fields');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing booking ID or customer email' }),
      };
    }

    // 1. Get the booking details first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_email', customerEmail)
      .single();

    console.log('DEBUG: Booking lookup result:', booking, 'error:', bookingError);

    if (bookingError || !booking) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Booking not found or access denied' }),
      };
    }

    // 2. Delete the booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('customer_email', customerEmail);

    console.log('DEBUG: Booking deletion result - error:', deleteError);

    if (deleteError) {
      console.error('Booking deletion error:', deleteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to cancel booking',
          details: deleteError.message
        }),
      };
    }

    // 3. Get current package data and restore lesson
    const { data: packageData, error: packageGetError } = await supabase
      .from('packages')
      .select('lessons_remaining')
      .eq('code', booking.package_code)
      .single();

    if (!packageGetError && packageData) {
      const { error: packageUpdateError } = await supabase
        .from('packages')
        .update({
          lessons_remaining: packageData.lessons_remaining + 1
        })
        .eq('code', booking.package_code);

      console.log('DEBUG: Package update result - error:', packageUpdateError);

      if (packageUpdateError) {
        console.error('Package update error:', packageUpdateError);
        // Non-critical, booking is already cancelled
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Booking cancelled successfully',
        cancelledBooking: {
          id: booking.id,
          packageCode: booking.package_code,
          timeSlotId: booking.time_slot_id
        }
      }),
    };

  } catch (error) {
    console.error('Cancel booking error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to cancel booking',
        details: error.message
      }),
    };
  }
};