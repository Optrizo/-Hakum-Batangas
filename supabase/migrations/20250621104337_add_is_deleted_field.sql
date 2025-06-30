/*
  # Add is_deleted field for soft deletes

  1. Schema Changes
    - Add `is_deleted` boolean field to cars table
    - Add `is_deleted` boolean field to motorcycles table
    - Set default value to false
    - Add indexes for better query performance

  2. Notes
    - This enables soft deletes instead of hard deletes
    - Deleted records will be marked as is_deleted = true
    - Queries should filter out deleted records by default
*/

-- Add is_deleted field to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add is_deleted field to motorcycles table
ALTER TABLE motorcycles ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Create indexes for better performance when filtering deleted records
CREATE INDEX IF NOT EXISTS idx_cars_is_deleted ON cars(is_deleted);
CREATE INDEX IF NOT EXISTS idx_motorcycles_is_deleted ON motorcycles(is_deleted);

-- Update existing records to have is_deleted = false
UPDATE cars SET is_deleted = false WHERE is_deleted IS NULL;
UPDATE motorcycles SET is_deleted = false WHERE is_deleted IS NULL; 