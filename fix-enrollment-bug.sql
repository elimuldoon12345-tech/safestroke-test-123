-- FIX FOR ENROLLMENT COUNT BUG
-- This SQL script fixes the issue where all slots on the same day of week
-- are getting updated instead of just the specific slot

-- Step 1: Check current state (before fix)
SELECT 
    date,
    CASE EXTRACT(DOW FROM date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        ELSE 'Other'
    END as day_name,
    lesson_type,
    COUNT(*) as total_slots,
    SUM(current_enrollment) as total_enrolled,
    SUM(max_capacity) as total_capacity,
    SUM(max_capacity - current_enrollment) as total_available
FROM time_slots
WHERE lesson_type IN ('Splashlet', 'Droplet', 'Strokelet')
AND date >= '2025-10-01'
AND date <= '2025-10-31'
GROUP BY date, lesson_type
ORDER BY date, lesson_type;

-- Step 2: Reset ALL enrollment counts to 0
UPDATE time_slots 
SET current_enrollment = 0
WHERE date >= '2025-10-01';

-- Step 3: Update enrollment counts based on ACTUAL bookings
UPDATE time_slots ts
SET current_enrollment = (
    SELECT COUNT(*)
    FROM time_slot_bookings tsb
    WHERE tsb.time_slot_id = ts.id
    AND tsb.status = 'confirmed'
)
WHERE date >= '2025-10-01';

-- Step 4: Fix the slot status based on actual enrollment
UPDATE time_slots
SET status = CASE
    WHEN current_enrollment >= max_capacity THEN 'full'
    ELSE 'available'
END
WHERE date >= '2025-10-01';

-- Step 5: Verify the fix worked
SELECT 
    'After Fix' as status,
    date,
    CASE EXTRACT(DOW FROM date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        ELSE 'Other'
    END as day_name,
    lesson_type,
    COUNT(*) as total_slots,
    SUM(current_enrollment) as total_enrolled,
    SUM(max_capacity - current_enrollment) as total_available
FROM time_slots
WHERE lesson_type = 'Splashlet'
AND date >= '2025-10-01'
AND date <= '2025-10-31'
GROUP BY date, lesson_type
ORDER BY date;

-- Step 6: Check individual bookings to verify they're linked correctly
SELECT 
    tsb.id as booking_id,
    tsb.time_slot_id,
    tsb.student_name,
    tsb.package_code,
    ts.date,
    ts.start_time,
    ts.lesson_type,
    ts.current_enrollment,
    ts.max_capacity
FROM time_slot_bookings tsb
JOIN time_slots ts ON ts.id = tsb.time_slot_id
WHERE tsb.status = 'confirmed'
ORDER BY tsb.created_at DESC
LIMIT 10;

-- Step 7: IMPORTANT - Check and fix the trigger
-- The issue might be in the trigger updating wrong slots
-- Let's recreate it with better specificity

DROP TRIGGER IF EXISTS update_enrollment_on_booking ON time_slot_bookings;
DROP FUNCTION IF EXISTS update_time_slot_enrollment();

-- Create a MORE SPECIFIC trigger function
CREATE OR REPLACE FUNCTION update_time_slot_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: increment enrollment for the SPECIFIC slot only
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE time_slots 
    SET current_enrollment = current_enrollment + 1
    WHERE id = NEW.time_slot_id  -- ONLY this specific slot ID
    AND current_enrollment < max_capacity;  -- Safety check
    
  -- For DELETE or CANCEL: decrement enrollment for the SPECIFIC slot only  
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled') THEN
    UPDATE time_slots 
    SET current_enrollment = GREATEST(0, current_enrollment - 1)  -- Never go below 0
    WHERE id = COALESCE(OLD.time_slot_id, NEW.time_slot_id);  -- ONLY this specific slot ID
  END IF;
  
  -- Update slot status for the SPECIFIC slot only
  UPDATE time_slots
  SET status = CASE
    WHEN current_enrollment >= max_capacity THEN 'full'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.time_slot_id, OLD.time_slot_id);  -- ONLY this specific slot ID
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_enrollment_on_booking
AFTER INSERT OR UPDATE OR DELETE ON time_slot_bookings
FOR EACH ROW
EXECUTE FUNCTION update_time_slot_enrollment();

-- Final verification - this should show different counts for different dates
SELECT 
    date,
    start_time,
    lesson_type,
    group_number,
    current_enrollment,
    max_capacity,
    (max_capacity - current_enrollment) as available_spots
FROM time_slots
WHERE lesson_type = 'Splashlet'
AND date IN ('2025-10-05', '2025-10-12', '2025-10-19')
ORDER BY date, start_time, group_number;