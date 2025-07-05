/*
  # Add vehicle_type field to services table

  1. Schema Changes
    - Add `vehicle_type` text field to services table
    - Set default value to 'car' for existing services
    - Add index for better query performance

  2. Notes
    - This enables filtering services by vehicle type (car/motorcycle)
    - Existing services will default to 'car' type
    - New services can be created with specific vehicle types
*/

-- Add vehicle_type field to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'car';

-- Update existing records to have vehicle_type = 'car' if not set
UPDATE services SET vehicle_type = 'car' WHERE vehicle_type IS NULL;

-- Create index for better performance when filtering by vehicle type
CREATE INDEX IF NOT EXISTS idx_services_vehicle_type ON services(vehicle_type);

-- Add constraint to ensure vehicle_type is either 'car' or 'motorcycle'
ALTER TABLE services ADD CONSTRAINT check_services_vehicle_type 
  CHECK (vehicle_type IN ('car', 'motorcycle')); 