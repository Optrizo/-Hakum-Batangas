-- Create a function to handle SMS notifications when cars are completed
CREATE OR REPLACE FUNCTION handle_car_completion_sms()
RETURNS TRIGGER AS $$
DECLARE
    customer_phone TEXT;
    customer_name TEXT;
    services_list TEXT[];
    packages_list TEXT[];
    total_amount DECIMAL(10,2);
    completion_time TIMESTAMP;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Get customer information
        SELECT phone, name INTO customer_phone, customer_name
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- Get services
        SELECT ARRAY_AGG(s.name) INTO services_list
        FROM car_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.car_id = NEW.id;
        
        -- Get packages
        SELECT ARRAY_AGG(sp.name) INTO packages_list
        FROM car_service_packages csp
        JOIN service_packages sp ON csp.package_id = sp.id
        WHERE csp.car_id = NEW.id;
        
        -- Calculate total amount
        SELECT COALESCE(SUM(s.price), 0) + COALESCE(SUM(sp.pricing->>'price')::DECIMAL, 0) INTO total_amount
        FROM cars c
        LEFT JOIN car_services cs ON c.id = cs.car_id
        LEFT JOIN services s ON cs.service_id = s.id
        LEFT JOIN car_service_packages csp ON c.id = csp.car_id
        LEFT JOIN service_packages sp ON csp.package_id = sp.id
        WHERE c.id = NEW.id;
        
        -- Set completion time
        completion_time := COALESCE(NEW.completed_at, NOW());
        
        -- Only send SMS if we have a phone number
        IF customer_phone IS NOT NULL AND customer_phone != '' THEN
            -- Call the Edge Function via HTTP
            PERFORM
                net.http_post(
                    url := 'https://ildfelfpncfwogcumbcj.supabase.co/functions/v1/twilio-sms',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                    ),
                    body := jsonb_build_object(
                        'phoneNumber', customer_phone,
                        'customerName', COALESCE(customer_name, 'Customer'),
                        'plateNumber', NEW.plate_number,
                        'services', COALESCE(services_list, ARRAY[]::TEXT[]),
                        'packages', COALESCE(packages_list, ARRAY[]::TEXT[]),
                        'totalAmount', COALESCE(total_amount, 0),
                        'completionTime', completion_time
                    )
                );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_car_completion_sms ON cars;
CREATE TRIGGER trigger_car_completion_sms
    AFTER UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION handle_car_completion_sms();

-- Create the same trigger for motorcycles
CREATE OR REPLACE FUNCTION handle_motorcycle_completion_sms()
RETURNS TRIGGER AS $$
DECLARE
    customer_phone TEXT;
    customer_name TEXT;
    services_list TEXT[];
    packages_list TEXT[];
    total_amount DECIMAL(10,2);
    completion_time TIMESTAMP;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Get customer information
        SELECT phone, name INTO customer_phone, customer_name
        FROM customers 
        WHERE id = NEW.customer_id;
        
        -- Get services
        SELECT ARRAY_AGG(s.name) INTO services_list
        FROM motorcycle_services ms
        JOIN services s ON ms.service_id = s.id
        WHERE ms.motorcycle_id = NEW.id;
        
        -- Get packages
        SELECT ARRAY_AGG(sp.name) INTO packages_list
        FROM motorcycle_service_packages msp
        JOIN service_packages sp ON msp.package_id = sp.id
        WHERE msp.motorcycle_id = NEW.id;
        
        -- Calculate total amount
        SELECT COALESCE(SUM(s.price), 0) + COALESCE(SUM(sp.pricing->>'price')::DECIMAL, 0) INTO total_amount
        FROM motorcycles m
        LEFT JOIN motorcycle_services ms ON m.id = ms.motorcycle_id
        LEFT JOIN services s ON ms.service_id = s.id
        LEFT JOIN motorcycle_service_packages msp ON m.id = msp.motorcycle_id
        LEFT JOIN service_packages sp ON msp.package_id = sp.id
        WHERE m.id = NEW.id;
        
        -- Set completion time
        completion_time := COALESCE(NEW.completed_at, NOW());
        
        -- Only send SMS if we have a phone number
        IF customer_phone IS NOT NULL AND customer_phone != '' THEN
            -- Call the Edge Function via HTTP
            PERFORM
                net.http_post(
                    url := 'https://ildfelfpncfwogcumbcj.supabase.co/functions/v1/twilio-sms',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                    ),
                    body := jsonb_build_object(
                        'phoneNumber', customer_phone,
                        'customerName', COALESCE(customer_name, 'Customer'),
                        'plateNumber', NEW.plate_number,
                        'services', COALESCE(services_list, ARRAY[]::TEXT[]),
                        'packages', COALESCE(packages_list, ARRAY[]::TEXT[]),
                        'totalAmount', COALESCE(total_amount, 0),
                        'completionTime', completion_time
                    )
                );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for motorcycles
DROP TRIGGER IF EXISTS trigger_motorcycle_completion_sms ON motorcycles;
CREATE TRIGGER trigger_motorcycle_completion_sms
    AFTER UPDATE ON motorcycles
    FOR EACH ROW
    EXECUTE FUNCTION handle_motorcycle_completion_sms();

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http; 