// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface SMSNotificationData {
  phoneNumber: string;
  customerName: string;
  plateNumber: string;
  services: string[];
  packages: string[];
  totalAmount: number;
  completionTime: string;
}

interface TwilioResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

console.log("SMS Notification Function Loaded!");

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const { phoneNumber, customerName, plateNumber, services, packages, totalAmount, completionTime }: SMSNotificationData = await req.json();

    // Validate required fields
    if (!phoneNumber || !customerName || !plateNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phoneNumber, customerName, plateNumber' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Validate Twilio configuration
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio configuration');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Format phone number (remove + if present and ensure proper format)
    const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/\s/g, '');
    
    // Create SMS message
    const servicesText = services && services.length > 0 ? `\nServices: ${services.join(', ')}` : '';
    const packagesText = packages && packages.length > 0 ? `\nPackages: ${packages.join(', ')}` : '';
    const amountText = totalAmount ? `\nTotal Amount: ₱${totalAmount.toFixed(2)}` : '';
    
    const message = `🚗 Car Wash Complete!

Hi ${customerName},

Your vehicle (${plateNumber}) has been completed at ${completionTime || new Date().toLocaleString()}.${servicesText}${packagesText}${amountText}

Thank you for choosing our service!

- BusyBee Car Wash`;

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams({
      To: `+${formattedPhone}`,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio API error:', errorData);
      throw new Error(`Twilio API error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('SMS sent successfully:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS notification sent successfully',
        sid: result.sid 
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('SMS notification error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send SMS notification' 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/twilio-sms' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"phoneNumber":"+1234567890","customerName":"John Doe","plateNumber":"ABC123","services":["Exterior Wash","Interior Clean"],"packages":["Premium Package"],"totalAmount":500.00,"completionTime":"2025-01-05 14:30:00"}'

*/
