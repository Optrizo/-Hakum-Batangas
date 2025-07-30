// BusyBee SMS Utility (ES Module Compatible)
// Usage: Import and call sendSMS from frontend (browser) or backend (Node.js)

// Helper to detect Node.js environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Environment variable loader (Node.js or Vite)
const getEnv = (key) => {
  if (isNode && process.env && process.env[key]) {
    return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return undefined;
};

// Use axios if available (Node.js), otherwise use fetch (browser)
let axios;
try {
  axios = isNode ? require('axios') : null;
} catch (e) {
  axios = null;
}

// Function to convert phone number to international format
export function convertPhoneNumber(phoneNumber) {
  // Remove any non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    // Replace leading 0 with 63 (Philippines country code)
    return '63' + cleaned.slice(1);
  } else if (cleaned.startsWith('63')) {
    // Already has country code
    return cleaned;
  } else if (cleaned.length === 10) {
    // Assume 10-digit number without country code or leading zero
    return '63' + cleaned;
  }
  return cleaned;
}

/**
 * Send SMS using the Busybee Brandtxt API
 * @param {string} status - The status of the service (e.g., 'completed', 'waiting', etc.)
 * @param {string} plateNumber - The plate number of the car
 * @param {string} serviceType - The type of service performed (for in-progress)
 * @param {string} phoneNumber - The recipient's phone number
 * @param {number} [queueNumber] - The queue number (for waiting status)
 * @returns {Promise<void>} Resolves when the SMS is sent successfully
 */
export async function sendSMS(status, plateNumber, serviceType, phoneNumber, queueNumber) {
  // Log environment detection
  console.log('Environment detection - isNode:', isNode);
  console.log('Environment variables source:', isNode ? 'Node.js process.env' : 'Vite import.meta.env');

  // Get API credentials with better logging
  const apiKey = getEnv('VITE_Api_Key');
  const clientId = getEnv('VITE_Client_Id');
  const senderId = getEnv('VITE_SenderID');
  const smsUrl = getEnv('VITE_CURL') || 'https://app.brandtxt.io/api/v2/SendSMS';

  // Log credential presence (not the values themselves)
  console.log('API credentials check:', {
    apiKey: apiKey ? 'Present' : 'Missing',
    clientId: clientId ? 'Present' : 'Missing',
    senderId: senderId ? 'Present' : 'Missing',
    smsUrl: smsUrl
  });

  const convertedPhoneNumber = convertPhoneNumber(phoneNumber);

  // Compose message based on status
  let message = '';
  if (status === 'waiting') {
    message = `Hey your vehicle ${plateNumber} is ${queueNumber ? queueNumber : '?'} in the queue. Appreciate your patience for waiting.`;
  } else if (status === 'in-progress') {
    message = `We are now working on your vehicle (${plateNumber}), you availed our ${serviceType}.`;
  } else if (status === 'payment-pending') {
    message = `Our team leader just finished doing the final check on your vehicle. Its now ready for pickup and payment in our admin.`;
  } else if (status === 'completed') {
    message = `Thank you for visiting Hakum Auto Care, wish you liked our service! Take care driving!`;
  } 

  const payload = {
    SenderId: senderId,
    Is_Unicode: false,
    Is_Flash: false,
    SchedTime: '',
    GroupId: '',
    Message: message,
    MobileNumbers: convertedPhoneNumber,
    ApiKey: apiKey,
    ClientId: clientId
  };

  // Debug payload before sending
  console.log('Sending SMS with payload:', JSON.stringify(payload, null, 2));
  console.log('Using SMS URL:', smsUrl);

  try {
    if (axios) {
      // Node.js (axios)
      const response = await axios.post(smsUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data && response.data.ErrorCode !== 0) {
        throw new Error(`API Error: ${response.data.ErrorDescription} (Code: ${response.data.ErrorCode})`);
      }
      console.log('SMS sent successfully:', response.data);
    } else if (typeof fetch !== 'undefined') {
      // Browser (fetch)
      const response = await fetch(smsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API Error: ${errorData}`);
      }
      const data = await response.json();
      if (data && data.ErrorCode !== 0) {
        throw new Error(`API Error: ${data.ErrorDescription} (Code: ${data.ErrorCode})`);
      }
      console.log('SMS sent successfully:', data);
    } else {
      throw new Error('No HTTP client available (axios or fetch)');
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error sending SMS:', error.message);
    }
  }
}