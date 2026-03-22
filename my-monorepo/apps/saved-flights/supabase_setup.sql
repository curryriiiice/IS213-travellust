-- Supabase Database Setup for Saved Flights Microservice
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create flights table
CREATE TABLE IF NOT EXISTS flights (
    flight_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flight_number VARCHAR(50) NOT NULL,
    airline VARCHAR(100) NOT NULL,
    datetime_departure TIMESTAMPTZ NOT NULL,
    datetime_arrival TIMESTAMPTZ NOT NULL,
    external_link VARCHAR(500),
    trip_id UUID,
    cost NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flights_trip_id ON flights(trip_id);
CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON flights(flight_number);
CREATE INDEX IF NOT EXISTS idx_flights_airline ON flights(airline);

-- Add constraints to ensure data integrity
ALTER TABLE flights ADD CONSTRAINT chk_departure_before_arrival
CHECK (datetime_departure < datetime_arrival);

ALTER TABLE flights ADD CONSTRAINT chk_cost_non_negative
CHECK (cost >= 0 OR cost IS NULL);

-- Add comments for documentation
COMMENT ON TABLE flights IS 'Stores saved flight information from flight-search-wrapper';
COMMENT ON COLUMN flights.flight_id IS 'Unique identifier for the flight (auto-generated)';
COMMENT ON COLUMN flights.flight_number IS 'Flight number (e.g., SQ123, 710)';
COMMENT ON COLUMN flights.airline IS 'Airline name';
COMMENT ON COLUMN flights.datetime_departure IS 'Departure datetime with timezone';
COMMENT ON COLUMN flights.datetime_arrival IS 'Arrival datetime with timezone';
COMMENT ON COLUMN flights.external_link IS 'URL to flight booking page';
COMMENT ON COLUMN flights.trip_id IS 'UUID reference to trip from trips service';
COMMENT ON COLUMN flights.cost IS 'Flight cost in Singapore dollars (NUMERIC for precision)';
COMMENT ON COLUMN flights.created_at IS 'Timestamp when flight was saved (auto-generated)';

-- Grant necessary permissions (adjust as needed for your Supabase setup)
-- These are basic permissions - you may need to adjust based on your authentication setup
GRANT SELECT, INSERT, UPDATE, DELETE ON flights TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Optional: Create a function to validate flight data
CREATE OR REPLACE FUNCTION validate_flight_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure departure is before arrival
    IF NEW.datetime_departure >= NEW.datetime_arrival THEN
        RAISE EXCEPTION 'Departure time must be before arrival time';
    END IF;

    -- Ensure cost is non-negative
    IF NEW.cost IS NOT NULL AND NEW.cost < 0 THEN
        RAISE EXCEPTION 'Cost must be non-negative';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic validation
CREATE TRIGGER validate_flight_data_trigger
BEFORE INSERT OR UPDATE ON flights
FOR EACH ROW
EXECUTE FUNCTION validate_flight_data();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Supabase database setup complete for saved-flights microservice!';
    RAISE NOTICE '📋 Table: flights created with proper UUID and timezone support';
    RAISE NOTICE '🔑 Ready to accept flight data from flight-search-wrapper';
END $$;