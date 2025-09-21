-- SafeStroke Complete Database Schema for Supabase
-- Drop existing tables if needed (be careful with this in production!)
DROP TABLE IF EXISTS time_slot_bookings CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Customers table: stores customer information
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packages table: stores purchased lesson packages
CREATE TABLE packages (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  program VARCHAR(50) NOT NULL, -- 'Droplet', 'Splashlet', 'Strokelet'
  lessons_total INTEGER NOT NULL,
  lessons_remaining INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_intent_id VARCHAR(100),
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time slots table: pre-generated available time slots
CREATE TABLE time_slots (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  lesson_type VARCHAR(50) NOT NULL, -- 'Droplet', 'Splashlet', 'Strokelet'
  group_number INTEGER DEFAULT 1, -- For multiple groups at same time
  max_capacity INTEGER NOT NULL,
  current_enrollment INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'full', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, start_time, lesson_type, group_number)
);

-- Time slot bookings: links packages to specific time slots
CREATE TABLE time_slot_bookings (
  id BIGSERIAL PRIMARY KEY,
  time_slot_id BIGINT REFERENCES time_slots(id),
  package_code VARCHAR(50) REFERENCES packages(code),
  student_name VARCHAR(255) NOT NULL,
  student_age INTEGER,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'no-show', 'completed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(time_slot_id, package_code, student_name)
);

-- Bookings table: legacy support / alternative structure
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  package_code VARCHAR(50) NOT NULL REFERENCES packages(code),
  time_slot_id BIGINT REFERENCES time_slots(id),
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  student_name VARCHAR(255),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  class_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_packages_code ON packages(code);
CREATE INDEX idx_packages_customer_email ON packages(customer_email);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_time_slots_date ON time_slots(date);
CREATE INDEX idx_time_slots_lesson_type ON time_slots(lesson_type);
CREATE INDEX idx_time_slots_status ON time_slots(status);
CREATE INDEX idx_time_slot_bookings_package ON time_slot_bookings(package_code);
CREATE INDEX idx_time_slot_bookings_slot ON time_slot_bookings(time_slot_id);
CREATE INDEX idx_bookings_package_code ON bookings(package_code);

-- Enable Row Level Security (RLS) for security
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (allows full access via service key)
CREATE POLICY "Service role full access to packages" ON packages
  FOR ALL USING (true);

CREATE POLICY "Service role full access to customers" ON customers
  FOR ALL USING (true);

CREATE POLICY "Service role full access to time_slots" ON time_slots
  FOR ALL USING (true);

CREATE POLICY "Service role full access to time_slot_bookings" ON time_slot_bookings
  FOR ALL USING (true);

CREATE POLICY "Service role full access to bookings" ON bookings
  FOR ALL USING (true);

-- Function to update enrollment count when booking is made
CREATE OR REPLACE FUNCTION update_time_slot_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE time_slots 
    SET current_enrollment = current_enrollment + 1
    WHERE id = NEW.time_slot_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled') THEN
    UPDATE time_slots 
    SET current_enrollment = current_enrollment - 1
    WHERE id = COALESCE(OLD.time_slot_id, NEW.time_slot_id);
  END IF;
  
  -- Update slot status based on enrollment
  UPDATE time_slots
  SET status = CASE
    WHEN current_enrollment >= max_capacity THEN 'full'
    ELSE 'available'
  END
  WHERE id = COALESCE(NEW.time_slot_id, OLD.time_slot_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enrollment updates
CREATE TRIGGER update_enrollment_on_booking
AFTER INSERT OR UPDATE OR DELETE ON time_slot_bookings
FOR EACH ROW
EXECUTE FUNCTION update_time_slot_enrollment();

-- Function to decrease package lessons when booking is made
CREATE OR REPLACE FUNCTION decrease_package_lessons()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE packages 
    SET lessons_remaining = lessons_remaining - 1
    WHERE code = NEW.package_code;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    UPDATE packages 
    SET lessons_remaining = lessons_remaining + 1
    WHERE code = NEW.package_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for package lesson updates
CREATE TRIGGER update_package_lessons_on_booking
AFTER INSERT OR UPDATE ON time_slot_bookings
FOR EACH ROW
EXECUTE FUNCTION decrease_package_lessons();