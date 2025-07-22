import express from 'express';
import sendSMSRouter from './api/send-sms.js';

const app = express();
app.use(express.json());
app.use('/api', sendSMSRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});