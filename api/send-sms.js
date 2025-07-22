// Express route for sending SMS via BusyBee
import express from 'express';
import { sendSMS } from '../MyBusyBee/scripts/busybee-sms.js';

const router = express.Router();

// Define the route handler with the callback pattern
router.post('/send-sms', (req, res) => {
  const { status, plateNumber, serviceType, phoneNumber } = req.body;
  try {
    console.log(`[${new Date().toISOString()}] Request received:`, req.body);
    console.log(`[${new Date().toISOString()}] Attempting to send SMS with the following details:`, {
      status,
      plateNumber,
      serviceType,
      phoneNumber
    });
    
    // Using promise-based approach instead of async/await
    sendSMS(status, plateNumber, serviceType, phoneNumber)
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