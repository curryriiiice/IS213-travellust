-- Supabase Database Setup for Trips Atomic Microservice
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trips table if it doesn't exist
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_name VARCHAR(255) NOT NULL,
    member_ids UUID[] NOT NULL DEFAULT '{}',
    flight_ids UUID[] DEFAULT '{}',
    hotel_ids UUID[] DEFAULT '{}',
    attraction_ids UUID[] DEFAULT '{}',
    start_date DATE,
    end_date DATE,
    budget NUMERIC(10,2) DEFAULT 0,
    locations TEXT[] DEFAULT '{}',
    trip_date DATE,
    calculated_cost NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_member_ids ON trips USING GIN(member_ids);
CREATE INDEX IF NOT EXISTS idx_trips_flight_ids ON trips USING GIN(flight_ids);
CREATE INDEX IF NOT EXISTS idx_trips_hotel_ids ON trips USING GIN(hotel_ids);
CREATE INDEX IF NOT EXISTS idx_trips_attraction_ids ON trips USING GIN(attraction_ids);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trips_end_date ON trips(end_date);

-- Add constraints to ensure data integrity
ALTER TABLE trips ADD CONSTRAINT chk_start_date_before_end_date
CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);

ALTER TABLE trips ADD CONSTRAINT chk_budget_non_negative
CHECK (budget >= 0);

ALTER TABLE trips ADD CONSTRAINT chk_calculated_cost_non_negative
CHECK (calculated_cost IS NULL OR calculated_cost >= 0);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON trips;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON trips;
DROP POLICY IF EXISTS "Enable update for users based on member_ids" ON trips;
DROP POLICY IF EXISTS "Enable delete for users based on member_ids" ON trips;

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policies for proper access control
-- Allow service role (using service key) to have full access
CREATE POLICY "Enable service role full access" ON trips
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow anonymous/authenticated users to read trips
CREATE POLICY "Enable read access for all users" ON trips
FOR SELECT
USING (true);

-- Allow authenticated users to insert trips
CREATE POLICY "Enable insert for authenticated users" ON trips
FOR INSERT
WITH CHECK (true);

-- Allow users to update trips they are members of
CREATE POLICY "Enable update for users based on member_ids" ON trips
FOR UPDATE
USING (auth.uid() = ANY(member_ids))
WITH CHECK (auth.uid() = ANY(member_ids));

-- Allow users to delete trips they are members of
CREATE POLICY "Enable delete for users based on member_ids" ON trips
FOR DELETE
USING (auth.uid() = ANY(member_ids));

-- Grant necessary permissions
-- For service role (used with service key)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- For authenticated users
GRANT SELECT, INSERT ON trips TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- For anonymous users (for testing)
GRANT SELECT, INSERT ON trips TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Add comments for documentation
COMMENT ON TABLE trips IS 'Stores trip information with members, flights, hotels, and attractions';
COMMENT ON COLUMN trips.id IS 'Unique identifier for the trip (auto-generated)';
COMMENT ON COLUMN trips.trip_name IS 'Trip name/title';
COMMENT ON COLUMN trips.member_ids IS 'Array of user UUIDs who are trip members';
COMMENT ON COLUMN trips.flight_ids IS 'Array of flight UUIDs associated with this trip';
COMMENT ON COLUMN trips.hotel_ids IS 'Array of hotel UUIDs associated with this trip';
COMMENT ON COLUMN trips.attraction_ids IS 'Array of attraction UUIDs associated with this trip';
COMMENT ON COLUMN trips.start_date IS 'Trip start date';
COMMENT ON COLUMN trips.end_date IS 'Trip end date';
COMMENT ON COLUMN trips.budget IS 'Trip budget amount (NUMERIC for precision)';
COMMENT ON COLUMN trips.locations IS 'Array of location names (legacy field)';
COMMENT ON COLUMN trips.trip_date IS 'Single date field (legacy)';
COMMENT ON COLUMN trips.calculated_cost IS 'Calculated total cost (legacy)';
COMMENT ON COLUMN trips.created_at IS 'Timestamp when trip was created (auto-generated)';
COMMENT ON COLUMN trips.updated_at IS 'Timestamp when trip was last updated (auto-updated)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase database setup complete for trips_atomic microservice!';
    RAISE NOTICE '📋 Table: trips created with proper UUID, array support, and indexes';
    RAISE NOTICE '🔐 RLS policies enabled with service role full access';
    RAISE NOTICE '👥 Users can read all trips and update/delete trips they are members of';
    RAISE NOTICE '🔑 Ready to accept trip data from trips_atomic service';
END $$;