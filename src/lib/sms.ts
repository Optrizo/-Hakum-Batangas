import { supabase } from './supabase';

export interface SMSNotificationData {
  phoneNumber: string;
  customerName: string;
  plateNumber: string;
  services: string[];
  packages: string[];
  totalAmount: number;
  completionTime: string;
}

export interface SMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  sid?: string;
}

/**
 * Send SMS notification via Supabase Edge Function
 */
export async function sendSMSNotification(data: SMSNotificationData): Promise<SMSResponse> {
  try {
    const { data: response, error } = await supabase.functions.invoke('twilio-sms', {
      body: data,
    });

    if (error) {
      console.error('SMS notification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS notification',
      };
    }

    return {
      success: true,
      message: 'SMS notification sent successfully',
      sid: response?.sid,
    };
  } catch (error) {
    console.error('SMS notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS notification',
    };
  }
}

/**
 * Send SMS notification for a completed car
 */
export async function sendCarCompletionSMS(
  customerPhone: string,
  customerName: string,
  plateNumber: string,
  services: string[] = [],
  packages: string[] = [],
  totalAmount: number = 0
): Promise<SMSResponse> {
  return sendSMSNotification({
    phoneNumber: customerPhone,
    customerName,
    plateNumber,
    services,
    packages,
    totalAmount,
    completionTime: new Date().toLocaleString(),
  });
}

/**
 * Send SMS notification for a completed motorcycle
 */
export async function sendMotorcycleCompletionSMS(
  customerPhone: string,
  customerName: string,
  plateNumber: string,
  services: string[] = [],
  packages: string[] = [],
  totalAmount: number = 0
): Promise<SMSResponse> {
  return sendSMSNotification({
    phoneNumber: customerPhone,
    customerName,
    plateNumber,
    services,
    packages,
    totalAmount,
    completionTime: new Date().toLocaleString(),
  });
}

/**
 * React hook for SMS notifications
 */
export function useSMSNotification() {
  const sendNotification = async (data: SMSNotificationData): Promise<SMSResponse> => {
    return sendSMSNotification(data);
  };

  const sendCarNotification = async (
    customerPhone: string,
    customerName: string,
    plateNumber: string,
    services: string[] = [],
    packages: string[] = [],
    totalAmount: number = 0
  ): Promise<SMSResponse> => {
    return sendCarCompletionSMS(customerPhone, customerName, plateNumber, services, packages, totalAmount);
  };

  const sendMotorcycleNotification = async (
    customerPhone: string,
    customerName: string,
    plateNumber: string,
    services: string[] = [],
    packages: string[] = [],
    totalAmount: number = 0
  ): Promise<SMSResponse> => {
    return sendMotorcycleCompletionSMS(customerPhone, customerName, plateNumber, services, packages, totalAmount);
  };

  return {
    sendNotification,
    sendCarNotification,
    sendMotorcycleNotification,
  };
}

/**
 * Format phone number for SMS
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with +63 (Philippines)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+63' + cleaned.substring(1);
  }
  
  // If it's 11 digits and starts with 9, add +63
  if (cleaned.length === 11 && cleaned.startsWith('9')) {
    return '+63' + cleaned;
  }
  
  // If it's already in international format, return as is
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  
  // Default: assume it's a local number and add +63
  return '+63' + cleaned;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic validation for Philippine mobile numbers
  const phMobileRegex = /^\+63[9]\d{9}$/;
  return phMobileRegex.test(formatted);
} 