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

  try {
    if (event.httpMethod === 'GET') {
      // Get available classes for a program
      return await getAvailableClasses(event, headers);
    } else if (event.httpMethod === 'POST') {
      // Book a class
      return await bookClass(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('Book class error:', error);
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

async function getAvailableClasses(event, headers) {
  const program = event.queryStringParameters?.program;

  if (!program) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Program parameter is required' }),
    };
  }

  // Get available classes from database
  // For now, we'll generate mock data since you might not have the classes table set up yet
  const mockClasses = generateMockClasses(program);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(mockClasses),
  };
}

async function bookClass(event, headers) {
  const { packageCode, classId, customerEmail, customerName, customerPhone } = JSON.parse(event.body);

  // Validate required fields
  if (!packageCode || !classId || !customerEmail || !customerName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required booking information' }),
    };
  }

  // Verify the package is valid and has remaining lessons
  const { data: packageData, error: packageError } = await supabase
    .from('packages')
    .select('*')
    .eq('code', packageCode)
    .eq('status', 'paid')
    .single();

  if (packageError || !packageData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid package code' }),
    };
  }

  if (packageData.lessons_remaining <= 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No remaining lessons in this package' }),
    };
  }

  // Create or update customer record
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('*')
    .eq('email', customerEmail)
    .single();

  if (!existingCustomer) {
    const { error: customerError } = await supabase
      .from('customers')
      .insert([
        {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          created_at: new Date().toISOString(),
        }
      ]);

    if (customerError) {
      console.error('Customer creation error:', customerError);
    }
  }

  // Create booking record
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert([
      {
        package_code: packageCode,
        class_id: classId,
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
        booking_date: new Date().toISOString(),
        status: 'confirmed',
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

  // Decrease remaining lessons in package
  const { error: updateError } = await supabase
    .from('packages')
    .update({ 
      lessons_remaining: packageData.lessons_remaining - 1,
      customer_email: customerEmail // Associate package with customer
    })
    .eq('code', packageCode);

  if (updateError) {
    console.error('Package update error:', updateError);
    // Continue anyway - we can fix this manually if needed
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      bookingId: booking.id,
      lessonsRemaining: packageData.lessons_remaining - 1,
    }),
  };
}

function generateMockClasses(program) {
  const classes = [];
  const today = new Date();
  
  // Generate 15 available time slots over the next 3 weeks
  for (let i = 1; i <= 15; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + Math.floor(i * 1.5));
    
    // Set to various times between 9 AM and 6 PM, skip weekends for some realism
    if (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
      continue; // Skip weekends
    }
    
    const hours = [9, 10, 11, 14, 15, 16, 17];
    const randomHour = hours[Math.floor(Math.random() * hours.length)];
    futureDate.setHours(randomHour, 0, 0, 0);
    
    classes.push({
      id: `class_${program}_${i}`,
      program: program,
      date_time: futureDate.toISOString(),
      max_capacity: 6,
      current_enrollment: Math.floor(Math.random() * 4), // Random current enrollment
      instructor: 'SafeStroke Instructor',
    });
  }
  
  return classes.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
}