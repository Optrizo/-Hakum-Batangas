/*
  # Add is_deleted field to services and crew_members tables

  1. Schema Changes
    - Add `is_deleted` boolean field to services table
    - Add `is_deleted` boolean field to crew_members table
    - Set default value to false for existing records
    - Add indexes for better query performance

  2. Notes
    - This enables soft deletes for services and crew members
    - Existing records will default to is_deleted = false
    - Frontend code already expects these fields
*/

-- Add is_deleted field to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Update existing services to have is_deleted = false if not set
UPDATE services SET is_deleted = false WHERE is_deleted IS NULL;

-- Create index for better performance when filtering by is_deleted
CREATE INDEX IF NOT EXISTS idx_services_is_deleted ON services(is_deleted);

-- Add is_deleted field to crew_members table
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Update existing crew members to have is_deleted = false if not set
UPDATE crew_members SET is_deleted = false WHERE is_deleted IS NULL;

-- Create index for better performance when filtering by is_deleted
CREATE INDEX IF NOT EXISTS idx_crew_members_is_deleted ON crew_members(is_deleted); 