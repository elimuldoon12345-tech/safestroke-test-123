-- Generate time slots for SafeStroke lessons
-- This script populates the time_slots table with the recurring schedule

-- Function to generate time slots for a date range
CREATE OR REPLACE FUNCTION generate_time_slots(
  start_date DATE,
  end_date DATE
) RETURNS VOID AS $$
DECLARE
  current_date DATE;
  slot_time TIME;
BEGIN
  current_date := start_date;
  
  WHILE current_date <= end_date LOOP
    -- SUNDAYS (3-5 PM)
    IF EXTRACT(DOW FROM current_date) = 0 THEN
      
      -- 3:00-3:30 PM: Droplet (1 group, 8 slots)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES (current_date, '15:00:00', '15:30:00', 0, 'Droplet', 1, 8)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 3:00-3:30 PM: Splashlet (1 group, 4 slots)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES (current_date, '15:00:00', '15:30:00', 0, 'Splashlet', 1, 4)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 3:00-3:30 PM: Strokelet (1 group, 3 slots)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES (current_date, '15:00:00', '15:30:00', 0, 'Strokelet', 1, 3)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 3:30-4:00 PM: Splashlet (2 groups, 4 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '15:30:00', '16:00:00', 0, 'Splashlet', 1, 4),
        (current_date, '15:30:00', '16:00:00', 0, 'Splashlet', 2, 4)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 3:30-4:00 PM: Strokelet (2 groups, 3 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '15:30:00', '16:00:00', 0, 'Strokelet', 1, 3),
        (current_date, '15:30:00', '16:00:00', 0, 'Strokelet', 2, 3)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 4:00-4:30 PM: Splashlet (2 groups, 4 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '16:00:00', '16:30:00', 0, 'Splashlet', 1, 4),
        (current_date, '16:00:00', '16:30:00', 0, 'Splashlet', 2, 4)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 4:00-4:30 PM: Strokelet (2 groups, 3 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '16:00:00', '16:30:00', 0, 'Strokelet', 1, 3),
        (current_date, '16:00:00', '16:30:00', 0, 'Strokelet', 2, 3)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 4:30-5:00 PM: Splashlet (2 groups, 4 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '16:30:00', '17:00:00', 0, 'Splashlet', 1, 4),
        (current_date, '16:30:00', '17:00:00', 0, 'Splashlet', 2, 4)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
      -- 4:30-5:00 PM: Strokelet (2 groups, 3 slots each)
      INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
      VALUES 
        (current_date, '16:30:00', '17:00:00', 0, 'Strokelet', 1, 3),
        (current_date, '16:30:00', '17:00:00', 0, 'Strokelet', 2, 3)
      ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
      
    -- MONDAYS (5-7 PM)
    ELSIF EXTRACT(DOW FROM current_date) = 1 THEN
      
      -- Generate slots for every 30 minutes from 5:00 PM to 6:30 PM
      -- (5:00-5:30, 5:30-6:00, 6:00-6:30, 6:30-7:00)
      slot_time := '17:00:00'::TIME;
      
      WHILE slot_time < '19:00:00'::TIME LOOP
        -- Splashlet (2 groups, 4 slots each)
        INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
        VALUES 
          (current_date, slot_time, slot_time + INTERVAL '30 minutes', 1, 'Splashlet', 1, 4),
          (current_date, slot_time, slot_time + INTERVAL '30 minutes', 1, 'Splashlet', 2, 4)
        ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
        
        -- Strokelet (2 groups, 3 slots each)
        INSERT INTO time_slots (date, start_time, end_time, day_of_week, lesson_type, group_number, max_capacity)
        VALUES 
          (current_date, slot_time, slot_time + INTERVAL '30 minutes', 1, 'Strokelet', 1, 3),
          (current_date, slot_time, slot_time + INTERVAL '30 minutes', 1, 'Strokelet', 2, 3)
        ON CONFLICT (date, start_time, lesson_type, group_number) DO NOTHING;
        
        slot_time := slot_time + INTERVAL '30 minutes';
      END LOOP;
      
    END IF;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate time slots for the next 3 months starting from October 5, 2025
-- Note: Adjust the date if needed based on when you're running this
SELECT generate_time_slots('2025-10-05'::DATE, '2026-01-05'::DATE);

-- Verify the generated slots
SELECT 
  date,
  to_char(start_time, 'HH:MI AM') as start,
  to_char(end_time, 'HH:MI AM') as end,
  lesson_type,
  group_number,
  max_capacity,
  current_enrollment,
  status
FROM time_slots
WHERE date >= '2025-10-05'
ORDER BY date, start_time, lesson_type, group_number
LIMIT 50;