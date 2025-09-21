-- SafeStroke Database Schema for Supabase
-- Run these commands in your Supabase SQL editor

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
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table: stores customer information
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table: stores individual class bookings
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  package_code VARCHAR(50) NOT NULL REFERENCES packages(code),
  class_id VARCHAR(100) NOT NULL, -- Could be Acuity appointment ID or internal ID
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  class_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table (optional): if you want to manage classes in Supabase instead of Acuity
CREATE TABLE classes (
  id BIGSERIAL PRIMARY KEY,
  program VARCHAR(50) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  max_capacity INTEGER DEFAULT 6,
  current_enrollment INTEGER DEFAULT 0,
  instructor VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'full'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_packages_code ON packages(code);
CREATE INDEX idx_packages_customer_email ON packages(customer_email);
CREATE INDEX idx_bookings_package_code ON bookings(package_code);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_classes_program_date ON classes(program, date_time);

-- Enable Row Level Security (RLS) for security
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create policies (these allow the service key to access everything)
-- You can make these more restrictive based on your needs

-- Packages policies
CREATE POLICY "Allow service role full access to packages" ON packages
  FOR ALL USING (true);

-- Customers policies  
CREATE POLICY "Allow service role full access to customers" ON customers
  FOR ALL USING (true);

-- Bookings policies
CREATE POLICY "Allow service role full access to bookings" ON bookings
  FOR ALL USING (true);

-- Classes policies
CREATE POLICY "Allow service role full access to classes" ON classes
  FOR ALL USING (true);