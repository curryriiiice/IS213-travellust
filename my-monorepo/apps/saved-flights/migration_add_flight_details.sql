-- Migration: Add additional flight details columns
-- Run this in your Supabase SQL Editor to add missing columns to flights table

-- Add aircraft_type column
ALTER TABLE flights ADD COLUMN IF NOT EXISTS aircraft_type VARCHAR(100);
COMMENT ON COLUMN flights.aircraft_type IS 'Aircraft type (e.g., Boeing 777, Airbus A330)';

-- Add legroom column
ALTER TABLE flights ADD COLUMN IF NOT EXISTS legroom VARCHAR(50);
COMMENT ON COLUMN flights.legroom IS 'Legroom information (e.g., "32 in", "Standard")';

-- Add co2_kg column
ALTER TABLE flights ADD COLUMN IF NOT EXISTS co2_kg NUMERIC(10,2);
COMMENT ON COLUMN flights.co2_kg IS 'CO2 emissions in kilograms';

-- Add origin column
ALTER TABLE flights ADD COLUMN IF NOT EXISTS origin VARCHAR(10);
COMMENT ON COLUMN flights.origin IS 'Origin airport code (e.g., SIN, JFK)';

-- Add destination column
ALTER TABLE flights ADD COLUMN IF NOT EXISTS destination VARCHAR(10);
COMMENT ON COLUMN flights.destination IS 'Destination airport code (e.g., HKG, LHR)';

-- Add deleted column for soft delete functionality
ALTER TABLE flights ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN flights.deleted IS 'Soft delete flag - true if flight has been deleted';

-- Create index for origin and destination for better query performance
CREATE INDEX IF NOT EXISTS idx_flights_origin ON flights(origin);
CREATE INDEX IF NOT EXISTS idx_flights_destination ON flights(destination);
CREATE INDEX IF NOT EXISTS idx_flights_deleted ON flights(deleted);

-- Update validation function to handle new fields
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

    -- Ensure co2_kg is non-negative
    IF NEW.co2_kg IS NOT NULL AND NEW.co2_kg < 0 THEN
        RAISE EXCEPTION 'CO2 emissions must be non-negative';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete! Added aircraft_type, legroom, co2_kg, origin, destination, and deleted columns to flights table';
    RAISE NOTICE '🔑 Updated validation function and created new indexes';
    RAISE NOTICE '📋 Flights table is now ready for enhanced flight details';
END $$;
