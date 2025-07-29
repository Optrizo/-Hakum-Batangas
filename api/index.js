// Use a direct handler function for the Vercel serverless environment
import { sendSMS } from '../MyBusyBee/scripts/busybee-sms.js';

// Standard Node.js handler function for Vercel serverless functions
export default function handler(req, res) {
  // Log the request
  console.log(`[${new Date().toISOString()}] Request method: ${req.method}`);
  console.log(`[${new Date().toISOString()}] Request path: ${req.url}`);

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log(`[${new Date().toISOString()}] Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extract the data
  const { status, plateNumber, serviceType, phoneNumber, queueNumber } = req.body;
  console.log(`[${new Date().toISOString()}] Request body:`, req.body);

  // Validate required fields
  if (!status || !plateNumber || !phoneNumber) {
    console.log(`[${new Date().toISOString()}] Missing required fields`);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Send the SMS
  return sendSMS(status, plateNumber, serviceType, phoneNumber, queueNumber)
    .then(() => {
      console.log(`[${new Date().toISOString()}] SMS sent successfully`);
      return res.status(200).json({ success: true });
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] Error sending SMS:`, error);
      return res.status(500).json({ error: error.message || 'Failed to send SMS' });
    });
}
