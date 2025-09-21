const { createClient } = require('@supabase/supabase-js');
const { sendBookingConfirmation } = require('./email-service');

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
      packageCode,
      timeSlotId,
      studentName,
      studentAge,
      customerName,
      customerEmail,
      customerPhone,
      notes
    } = JSON.parse(event.body);

    // Validate required fields
    if (!packageCode || !timeSlotId || !studentName || !customerName || !customerEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Start a transaction-like operation
    // 1. Verify package is valid and has remaining lessons
    // For single lessons, we also accept 'pending' status if it's very recent (within 5 minutes)
    let packageData = null;
    
    // First try to find a paid package
    const { data: paidPackage, error: paidError } = await supabase
      .from('packages')
      .select('*')
      .eq('code', packageCode)
      .eq('status', 'paid')
      .single();
    
    if (paidPackage) {
      packageData = paidPackage;
    } else {
      // Check for a pending single lesson package created recently
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: pendingPackage, error: pendingError } = await supabase
        .from('packages')
        .select('*')
        .eq('code', packageCode)
        .eq('status', 'pending')
        .eq('lessons_total', 1) // Only for single lessons
        .gte('created_at', fiveMinutesAgo) // Created within last 5 minutes
        .single();
      
      if (pendingPackage) {
        // For single lessons with pending payment, allow booking
        // The webhook will update the status to 'paid' shortly
        packageData = pendingPackage;
        console.log('Allowing booking for pending single lesson package:', packageCode);
      }
    }

    if (!packageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid package code or payment not yet confirmed. Please try again in a moment.' }),
      };
    }

    if (packageData.lessons_remaining <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No remaining lessons in this package' }),
      };
    }

    // 2. Verify time slot is available
    const { data: slotData, error: slotError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', timeSlotId)
      .single();

    if (slotError || !slotData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid time slot' }),
      };
    }

    if (slotData.current_enrollment >= slotData.max_capacity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'This time slot is full' }),
      };
    }

    // 3. Check if this student is already booked for this slot
    const { data: existingBooking } = await supabase
      .from('time_slot_bookings')
      .select('id')
      .eq('time_slot_id', timeSlotId)
      .eq('package_code', packageCode)
      .eq('student_name', studentName)
      .single();

    if (existingBooking) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'This student is already booked for this time slot' }),
      };
    }

    // 4. Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('time_slot_bookings')
      .insert([
        {
          time_slot_id: timeSlotId,
          package_code: packageCode,
          student_name: studentName,
          student_age: studentAge,
          customer_email: customerEmail,
          customer_name: customerName,
          customer_phone: customerPhone,
          status: 'confirmed',
          notes: notes,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create booking' }),
      };
    }

    // 5. The database triggers will automatically:
    // - Update time_slot enrollment count
    // - Decrease package lessons_remaining
    // But we'll fetch the updated package to return the current count

    const { data: updatedPackage } = await supabase
      .from('packages')
      .select('lessons_remaining')
      .eq('code', packageCode)
      .single();

    // 6. Update or create customer record
    const { error: customerError } = await supabase
      .from('customers')
      .upsert([
        {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'email' });

    if (customerError) {
      console.error('Customer upsert error:', customerError);
      // Non-critical, continue
    }

    // 7. Send confirmation emails to customer and business
    try {
      await sendBookingConfirmation(booking, slotData);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bookingId: booking.id,
        lessonsRemaining: updatedPackage?.lessons_remaining || packageData.lessons_remaining - 1,
        booking: {
          ...booking,
          timeSlot: slotData
        }
      }),
    };

  } catch (error) {
    console.error('Book time slot error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to book time slot',
        details: error.message 
      }),
    };
  }
};