-- SafeStroke Booking System Database Schema
-- Run this in Supabase SQL Editor to create all necessary tables

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    program VARCHAR(50) NOT NULL, -- Droplet, Splashlet, Strokelet
    lessons INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    validity_days INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create purchases table (package codes)
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    package_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    package_id INTEGER REFERENCES packages(id),
    payment_method VARCHAR(20), -- stripe, paypal
    payment_id VARCHAR(255), -- Stripe payment intent ID or PayPal order ID
    purchase_date TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,
    lessons_total INTEGER NOT NULL,
    lessons_remaining INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    program VARCHAR(50) NOT NULL, -- Droplet, Splashlet, Strokelet
    instructor_name VARCHAR(100),
    date_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    max_capacity INTEGER DEFAULT 4,
    current_enrollment INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    acuity_appointment_id VARCHAR(50), -- For syncing with Acuity if needed
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id),
    class_id INTEGER REFERENCES classes(id),
    customer_id INTEGER REFERENCES customers(id),
    booking_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, attended, cancelled, no-show
    acuity_booking_id VARCHAR(50), -- For syncing with Acuity if needed
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(class_id, customer_id) -- Prevent double booking
);

-- Create payment_logs table for tracking
CREATE TABLE IF NOT EXISTS payment_logs (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    purchase_id INTEGER REFERENCES purchases(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20),
    payment_id VARCHAR(255),
    status VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial package data
INSERT INTO packages (name, program, lessons, price, validity_days) VALUES
-- Droplet packages
('Droplet 4-Lesson Package', 'Droplet', 4, 112.00, 30),
('Droplet 6-Lesson Package', 'Droplet', 6, 162.00, 45),
('Droplet 8-Lesson Package', 'Droplet', 8, 200.00, 60),
-- Splashlet packages
('Splashlet 4-Lesson Package', 'Splashlet', 4, 152.00, 30),
('Splashlet 6-Lesson Package', 'Splashlet', 6, 222.00, 45),
('Splashlet 8-Lesson Package', 'Splashlet', 8, 280.00, 60),
-- Strokelet packages
('Strokelet 4-Lesson Package', 'Strokelet', 4, 172.00, 30),
('Strokelet 6-Lesson Package', 'Strokelet', 6, 252.00, 45),
('Strokelet 8-Lesson Package', 'Strokelet', 8, 320.00, 60);

-- Create indexes for better performance
CREATE INDEX idx_purchases_package_code ON purchases(package_code);
CREATE INDEX idx_purchases_customer_id ON purchases(customer_id);
CREATE INDEX idx_bookings_purchase_id ON bookings(purchase_id);
CREATE INDEX idx_bookings_class_id ON bookings(class_id);
CREATE INDEX idx_classes_date_time ON classes(date_time);
CREATE INDEX idx_classes_program ON classes(program);

-- Create a view for available classes
CREATE OR REPLACE VIEW available_classes AS
SELECT 
    c.id,
    c.program,
    c.instructor_name,
    c.date_time,
    c.duration_minutes,
    c.max_capacity,
    c.current_enrollment,
    (c.max_capacity - c.current_enrollment) AS spots_available,
    c.status
FROM classes c
WHERE c.status = 'scheduled'
    AND c.date_time > NOW()
    AND c.current_enrollment < c.max_capacity
ORDER BY c.date_time;

-- Create a view for customer purchase history
CREATE OR REPLACE VIEW customer_purchase_summary AS
SELECT 
    c.id AS customer_id,
    c.email,
    c.first_name,
    c.last_name,
    COUNT(DISTINCT p.id) AS total_purchases,
    SUM(p.lessons_total) AS total_lessons_purchased,
    SUM(p.lessons_remaining) AS total_lessons_remaining,
    MAX(p.purchase_date) AS last_purchase_date
FROM customers c
LEFT JOIN purchases p ON c.id = p.customer_id
GROUP BY c.id, c.email, c.first_name, c.last_name;

-- Create function to update current_enrollment when booking is made
CREATE OR REPLACE FUNCTION update_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE classes 
        SET current_enrollment = current_enrollment + 1 
        WHERE id = NEW.class_id;
        
        UPDATE purchases 
        SET lessons_remaining = lessons_remaining - 1 
        WHERE id = NEW.purchase_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled') THEN
        UPDATE classes 
        SET current_enrollment = current_enrollment - 1 
        WHERE id = OLD.class_id;
        
        UPDATE purchases 
        SET lessons_remaining = lessons_remaining + 1 
        WHERE id = OLD.purchase_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enrollment updates
CREATE TRIGGER update_enrollment_trigger
AFTER INSERT OR DELETE OR UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_class_enrollment();

-- Create function to check if purchase is valid
CREATE OR REPLACE FUNCTION is_purchase_valid(code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    purchase_record RECORD;
BEGIN
    SELECT * INTO purchase_record
    FROM purchases
    WHERE package_code = code
        AND status = 'active'
        AND lessons_remaining > 0
        AND (expiry_date IS NULL OR expiry_date > NOW());
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) - Enable after setup
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
