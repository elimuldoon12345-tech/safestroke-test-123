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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
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

  try {
    const { program, date, month } = event.queryStringParameters || {};

    if (!program) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Program parameter is required' }),
      };
    }

    let query = supabase
      .from('time_slots')
      .select('*')
      .eq('lesson_type', program)
      .eq('status', 'available')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    // If specific date provided
    if (date) {
      query = query.eq('date', date);
    } 
    // If month provided (for calendar view)
    else if (month) {
      const monthDate = new Date(month);
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      query = query
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0]);
    }
    // Default: get next 30 days
    else {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      query = query
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', thirtyDaysFromNow.toISOString().split('T')[0]);
    }

    const { data: timeSlots, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Filter out full slots
    const availableSlots = timeSlots.filter(slot => 
      slot.current_enrollment < slot.max_capacity
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(availableSlots),
    };

  } catch (error) {
    console.error('Get time slots error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to retrieve time slots',
        details: error.message 
      }),
    };
  }
};