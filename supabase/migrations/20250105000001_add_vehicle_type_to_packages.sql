/*
  # Add vehicle_type field to service_packages table

  1. Schema Changes
    - Add `vehicle_type` text field to service_packages table
    - Set default value to 'car' for existing packages
    - Add index for better query performance

  2. Notes
    - This enables filtering packages by vehicle type (car/motorcycle)
    - Existing packages will default to 'car' type
    - New packages can be created with specific vehicle types
*/

-- Add vehicle_type field to service_packages table
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS vehicle_type text DEFAULT 'car';

-- Update existing records to have vehicle_type = 'car' if not set
UPDATE service_packages SET vehicle_type = 'car' WHERE vehicle_type IS NULL;

-- Create index for better performance when filtering by vehicle type
CREATE INDEX IF NOT EXISTS idx_service_packages_vehicle_type ON service_packages(vehicle_type);

-- Add constraint to ensure vehicle_type is either 'car' or 'motorcycle'
ALTER TABLE service_packages ADD CONSTRAINT check_vehicle_type 
  CHECK (vehicle_type IN ('car', 'motorcycle')); 