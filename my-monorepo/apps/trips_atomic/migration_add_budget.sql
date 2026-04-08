-- Migration to add budget field to trips table
-- Run this in your Supabase SQL Editor

-- Add budget column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget NUMERIC(10,2);

-- Add constraint to ensure budget is non-negative
ALTER TABLE trips ADD CONSTRAINT chk_budget_non_negative
CHECK (budget >= 0 OR budget IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN trips.budget IS 'Trip budget amount in the default currency (NUMERIC for precision)';

-- Set default budget to 0 for existing records (optional)
UPDATE trips SET budget = 0 WHERE budget IS NULL;

-- Make the column NOT NULL with default value (optional - remove if you want to allow NULL)
ALTER TABLE trips ALTER COLUMN budget SET NOT NULL;
ALTER TABLE trips ALTER COLUMN budget SET DEFAULT 0;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Budget field added to trips table successfully!';
    RAISE NOTICE '📋 Column: budget (NUMERIC(10,2)) with non-negative constraint';
END $$;