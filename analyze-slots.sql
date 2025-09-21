-- Comprehensive slot analysis for SafeStroke

-- 1. Check the ACTUAL slot structure for each day
SELECT 
    CASE EXTRACT(DOW FROM date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
    END as day_name,
    lesson_type,
    COUNT(DISTINCT start_time) as unique_time_slots,
    COUNT(*) as total_slot_records,
    SUM(max_capacity) as total_capacity,
    SUM(current_enrollment) as total_enrolled,
    SUM(max_capacity - current_enrollment) as total_available_spaces
FROM time_slots
WHERE date IN ('2025-10-05', '2025-10-06')  -- One Sunday and one Monday
GROUP BY EXTRACT(DOW FROM date), lesson_type
ORDER BY EXTRACT(DOW FROM date), lesson_type;

-- 2. Detailed breakdown for Splashlet on Sundays
SELECT 
    'Sunday Splashlet Details' as info,
    start_time,
    COUNT(*) as groups_at_this_time,
    SUM(max_capacity) as total_capacity_at_time,
    SUM(current_enrollment) as enrolled_at_time
FROM time_slots
WHERE date = '2025-10-05'
AND lesson_type = 'Splashlet'
GROUP BY start_time
ORDER BY start_time;

-- 3. Detailed breakdown for Splashlet on Mondays  
SELECT 
    'Monday Splashlet Details' as info,
    start_time,
    COUNT(*) as groups_at_this_time,
    SUM(max_capacity) as total_capacity_at_time,
    SUM(current_enrollment) as enrolled_at_time
FROM time_slots
WHERE date = '2025-10-06'
AND lesson_type = 'Splashlet'
GROUP BY start_time
ORDER BY start_time;

-- 4. Check if you have any bookings at all
SELECT 
    COUNT(*) as total_bookings,
    COUNT(DISTINCT time_slot_id) as unique_slots_booked,
    COUNT(DISTINCT package_code) as unique_packages_used
FROM time_slot_bookings
WHERE status = 'confirmed';

-- 5. If you have bookings, show them
SELECT 
    tsb.id,
    tsb.student_name,
    tsb.package_code,
    ts.date,
    ts.start_time,
    ts.lesson_type,
    ts.group_number
FROM time_slot_bookings tsb
JOIN time_slots ts ON ts.id = tsb.time_slot_id
WHERE tsb.status = 'confirmed'
ORDER BY ts.date, ts.start_time;