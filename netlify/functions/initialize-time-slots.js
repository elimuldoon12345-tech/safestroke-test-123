const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// This function initializes time slots for the schedule
// Call this once to populate your database, or periodically to add more slots
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
    const { startDate, endDate } = JSON.parse(event.body || '{}');
    
    // Default to next 3 months if no dates provided
    const start = startDate ? new Date(startDate) : new Date('2025-10-05');
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    console.log(`Generating time slots from ${start.toISOString()} to ${end.toISOString()}`);
    
    const slots = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      // SUNDAYS (day 0): 3-5 PM
      if (dayOfWeek === 0) {
        // 3:00-3:30 PM: Droplet (1 group, 8 slots)
        slots.push({
          date: dateStr,
          start_time: '15:00:00',
          end_time: '15:30:00',
          day_of_week: 0,
          lesson_type: 'Droplet',
          group_number: 1,
          max_capacity: 8,
          current_enrollment: 0,
          status: 'available'
        });
        
        // 3:00-3:30 PM: Also Splashlet and Strokelet (1 group each)
        slots.push({
          date: dateStr,
          start_time: '15:00:00',
          end_time: '15:30:00',
          day_of_week: 0,
          lesson_type: 'Splashlet',
          group_number: 1,
          max_capacity: 4,
          current_enrollment: 0,
          status: 'available'
        });
        
        slots.push({
          date: dateStr,
          start_time: '15:00:00',
          end_time: '15:30:00',
          day_of_week: 0,
          lesson_type: 'Strokelet',
          group_number: 1,
          max_capacity: 3,
          current_enrollment: 0,
          status: 'available'
        });
        
        // Rest of Sunday slots (3:30-5:00): 2 groups each of Splashlet and Strokelet
        const sundayTimes = [
          { start: '15:30:00', end: '16:00:00' },
          { start: '16:00:00', end: '16:30:00' },
          { start: '16:30:00', end: '17:00:00' }
        ];
        
        sundayTimes.forEach(time => {
          // 2 Splashlet groups
          for (let group = 1; group <= 2; group++) {
            slots.push({
              date: dateStr,
              start_time: time.start,
              end_time: time.end,
              day_of_week: 0,
              lesson_type: 'Splashlet',
              group_number: group,
              max_capacity: 4,
              current_enrollment: 0,
              status: 'available'
            });
          }
          
          // 2 Strokelet groups
          for (let group = 1; group <= 2; group++) {
            slots.push({
              date: dateStr,
              start_time: time.start,
              end_time: time.end,
              day_of_week: 0,
              lesson_type: 'Strokelet',
              group_number: group,
              max_capacity: 3,
              current_enrollment: 0,
              status: 'available'
            });
          }
        });
      }
      
      // MONDAYS (day 1): 5-7 PM
      if (dayOfWeek === 1) {
        const mondayTimes = [
          { start: '17:00:00', end: '17:30:00' },
          { start: '17:30:00', end: '18:00:00' },
          { start: '18:00:00', end: '18:30:00' },
          { start: '18:30:00', end: '19:00:00' }
        ];
        
        mondayTimes.forEach(time => {
          // 2 Splashlet groups
          for (let group = 1; group <= 2; group++) {
            slots.push({
              date: dateStr,
              start_time: time.start,
              end_time: time.end,
              day_of_week: 1,
              lesson_type: 'Splashlet',
              group_number: group,
              max_capacity: 4,
              current_enrollment: 0,
              status: 'available'
            });
          }
          
          // 2 Strokelet groups
          for (let group = 1; group <= 2; group++) {
            slots.push({
              date: dateStr,
              start_time: time.start,
              end_time: time.end,
              day_of_week: 1,
              lesson_type: 'Strokelet',
              group_number: group,
              max_capacity: 3,
              current_enrollment: 0,
              status: 'available'
            });
          }
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`Generated ${slots.length} time slots`);
    
    // Insert slots in batches to avoid timeout
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('time_slots')
        .upsert(batch, { 
          onConflict: 'date,start_time,lesson_type,group_number',
          ignoreDuplicates: true 
        });
      
      if (error) {
        console.error('Batch insert error:', error);
        // Continue with next batch even if one fails
      } else {
        inserted += batch.length;
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully created ${inserted} time slots`,
        totalSlots: slots.length
      }),
    };

  } catch (error) {
    console.error('Initialize time slots error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to initialize time slots',
        details: error.message 
      }),
    };
  }
};