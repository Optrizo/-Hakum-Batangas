// Express route for sending SMS via BusyBee
import express from 'express';
import { sendSMS } from '../MyBusyBee/scripts/busybee-sms.js';

const router = express.Router();

// Define the route handler with the callback pattern
router.post('/send-sms', (req, res) => {
  const { status, plateNumber, serviceType, phoneNumber, queueNumber } = req.body;
  // Validate required fields
  if (!status || !plateNumber || !phoneNumber) {
    console.error(`[${new Date().toISOString()}] Missing required field(s):`, { status, plateNumber, phoneNumber });
    return res.status(400).json({ error: 'Missing required field(s): status, plateNumber, phoneNumber are all required.' });
  }
  try {
    console.log(`[${new Date().toISOString()}] Request received:`, req.body);
    console.log(`[${new Date().toISOString()}] Attempting to send SMS with the following details:`, {
      status,
      plateNumber,
      serviceType,
      phoneNumber,
      queueNumber
    });
    // Pass queueNumber for 'waiting', serviceType for 'in-progress', both for completeness
    sendSMS(status, plateNumber, serviceType, phoneNumber, queueNumber)
      .then(() => {
        console.log(`[${new Date().toISOString()}] SMS sent successfully`);
        res.json({ success: true });
      })
      .catch((error) => {
        console.error(`[${new Date().toISOString()}] Error occurred while sending SMS:`, error.stack || error);
        res.status(500).json({ error: error.message });
      });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in route handler:`, error.stack || error);
    res.status(500).json({ error: error.message });
  }
});

export default router;