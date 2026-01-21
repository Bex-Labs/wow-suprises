-- Supabase Database Schema for Wow Surprises
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (stores additional user profile information)
-- Note: Supabase auth.users table is separate and managed by Supabase Auth
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only read and update their own data
CREATE POLICY "Users can view own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON users FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for packages table
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Everyone can read active packages
CREATE POLICY "Anyone can view active packages" 
    ON packages FOR SELECT 
    USING (is_active = true);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    booking_reference TEXT UNIQUE NOT NULL,
    
    -- Recipient Information
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    
    -- Delivery Information
    delivery_date DATE NOT NULL,
    delivery_time TEXT NOT NULL,
    
    -- Package Information (stored for history even if package is deleted)
    package_name TEXT NOT NULL,
    package_price DECIMAL(10, 2) NOT NULL,
    
    -- Optional Information
    special_message TEXT,
    
    -- Status and Timestamps
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_reference TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security for bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own bookings
CREATE POLICY "Users can view own bookings" 
    ON bookings FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can create their own bookings
CREATE POLICY "Users can create own bookings" 
    ON bookings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own bookings (with restrictions)
CREATE POLICY "Users can update own bookings" 
    ON bookings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample packages (optional)
INSERT INTO packages (name, description, price, category, features) VALUES
    ('Birthday Surprise Box', 'Complete birthday celebration package with decorations, cake, and gifts', 25000, 'Birthday', '["Birthday cake", "Decorations", "Gift box", "Party supplies"]'::jsonb),
    ('Anniversary Special', 'Romantic setup for your special day with flowers and champagne', 35000, 'Anniversary', '["Flower arrangement", "Champagne", "Romantic setup", "Personalized card"]'::jsonb),
    ('Congratulations Package', 'Celebrate achievements with a special surprise box', 20000, 'Celebration', '["Gift items", "Congratulations banner", "Celebration treats", "Personalized message"]'::jsonb),
    ('Love & Romance Box', 'Express your love with our romantic surprise package', 30000, 'Romance', '["Roses", "Chocolates", "Love notes", "Romantic setup"]'::jsonb),
    ('Get Well Soon Care', 'Thoughtful care package for someone special', 18000, 'Care', '["Comfort items", "Get well card", "Healthy snacks", "Care essentials"]'::jsonb),
    ('Baby Shower Surprise', 'Welcome the new arrival with adorable gifts', 40000, 'Baby', '["Baby gifts", "Decorations", "Mom care package", "Celebration setup"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Comments
COMMENT ON TABLE users IS 'Extended user profile information';
COMMENT ON TABLE packages IS 'Surprise packages available for booking';
COMMENT ON TABLE bookings IS 'User bookings and orders';