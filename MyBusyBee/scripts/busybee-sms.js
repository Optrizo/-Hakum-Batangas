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

// Message pools for variety
const messageTemplates = {
  'waiting': [
    `Hey! Your vehicle {plateNumber} is {queueNumber} in the queue. Appreciate your patience for waiting.`,
    `Hi there! Your car {plateNumber} is currently {queueNumber} in line. Thanks for your patience!`,
    `Hello! Vehicle {plateNumber} is {queueNumber} in our service queue. We'll get to you soon!`,
    `Good day! Your vehicle {plateNumber} is {queueNumber} waiting to be serviced. Thank you for waiting patiently.`,
    `Greetings! Your car {plateNumber} is {queueNumber} in our queue. We appreciate your understanding while you wait.`
  ],
  'in-progress': [
    `We are now working on your vehicle ({plateNumber}), you availed our {serviceType}.`,
    `Great news! We've started servicing your vehicle {plateNumber} with our {serviceType} service.`,
    `Your vehicle {plateNumber} is now being serviced! Our team is working on your {serviceType}.`,
    `We're currently working on your car {plateNumber}. Your {serviceType} service is in progress.`,
    `Good news! Your vehicle {plateNumber} is now under our care for the {serviceType} service.`
  ],
  'payment-pending': [
    `Our team leader just finished doing the final check on your vehicle. It's now ready for pickup and payment in our admin.`,
    `Great news! Your vehicle has passed our final inspection and is ready for pickup. Please proceed to admin for payment.`,
    `Your car is all set! Final quality check completed. Please come to our admin office for payment and pickup.`,
    `Excellent! Your vehicle has been thoroughly checked and is ready. Kindly visit our admin for payment processing.`,
    `Your vehicle service is complete! Final inspection done. Please head to our admin area for payment and pickup.`
  ],
  'completed': [
    `Thank you for visiting Hakum Auto Care, wish you liked our service! Take care driving!`,
    `Thank you for choosing Hakum Auto Care! We hope you're satisfied with our service. Drive safely!`,
    `It was a pleasure serving you at Hakum Auto Care! Hope you enjoyed our service. Safe travels!`,
    `Thanks for trusting Hakum Auto Care with your vehicle! We hope you loved our service. Drive safe!`,
    `Thank you for your business! We're glad we could serve you at Hakum Auto Care. Take care on the road!`,
    `Appreciate your visit to Hakum Auto Care! Hope our service exceeded your expectations. Drive safely!`
  ]
};

/**
 * Get a random message template for the given status
 * @param {string} status - The status type
 * @param {string} plateNumber - The plate number
 * @param {string} serviceType - The service type (for in-progress status)
 * @param {number|string} queueNumber - The queue number (for waiting status)
 * @returns {string} A randomly selected and formatted message
 */
function getRandomMessage(status, plateNumber, serviceType, queueNumber) {
  const templates = messageTemplates[status];
  if (!templates || templates.length === 0) {
    return `Status update for vehicle ${plateNumber}`;
  }
  
  // Select random template
  const randomIndex = Math.floor(Math.random() * templates.length);
  let selectedTemplate = templates[randomIndex];
  
  // Replace placeholders
  selectedTemplate = selectedTemplate.replace(/\{plateNumber\}/g, plateNumber);
  selectedTemplate = selectedTemplate.replace(/\{serviceType\}/g, serviceType || '');
  selectedTemplate = selectedTemplate.replace(/\{queueNumber\}/g, queueNumber || '?');
  
  return selectedTemplate;
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

  // Generate the message using the random message template
  const message = getRandomMessage(status, plateNumber, serviceType, queueNumber);

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