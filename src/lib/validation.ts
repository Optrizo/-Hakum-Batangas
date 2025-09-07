// Validation utilities for the Hakum Auto Care application

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// License plate validation for Philippine format and conduction stickers
export const validateLicensePlate = (plate: string): ValidationResult => {
  if (!plate || typeof plate !== 'string') {
    return { isValid: false, error: 'License plate is required' };
  }

  const sanitizedPlate = plate.trim().toUpperCase();
  
  if (sanitizedPlate.length < 3) {
    return { isValid: false, error: 'License plate must be at least 3 characters long' };
  }

  if (sanitizedPlate.length > 8) {
    return { isValid: false, error: 'License plate is too long' };
  }

  // Check if the plate contains a dash to maintain basic structure
  if (!sanitizedPlate.includes('-')) {
    return { isValid: false, error: 'Please include a dash (-) in the plate number' };
  }

  // Verify the plate has valid parts before and after the dash
  const parts = sanitizedPlate.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { isValid: false, error: 'Plate number must have valid characters before and after the dash' };
  }

  return { isValid: true };
};

// Motorcycle license plate validation with flexible format
export const validateMotorcyclePlate = (plate: string): ValidationResult => {
  if (!plate || typeof plate !== 'string') {
    return { isValid: false, error: 'Motorcycle license plate is required' };
  }

  const sanitizedPlate = plate.trim().toUpperCase();
  
  if (sanitizedPlate.length < 3) {
    return { isValid: false, error: 'Motorcycle plate must be at least 3 characters long' };
  }

  if (sanitizedPlate.length > 8) {
    return { isValid: false, error: 'Motorcycle plate is too long' };
  }

  // Check if the plate contains a dash to maintain basic structure
  if (!sanitizedPlate.includes('-')) {
    return { isValid: false, error: 'Please include a dash (-) in the plate number' };
  }

  // Verify the plate has valid parts before and after the dash
  const parts = sanitizedPlate.split('-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { isValid: false, error: 'Plate number must have valid characters before and after the dash' };
  }

  return { isValid: true };
};

// Phone number validation for Philippine format
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Phone is optional
  }

  const sanitizedPhone = phone.replace(/\s/g, '');
  const phoneRegex = /^(09|\+639)\d{9}$/;
  
  if (!phoneRegex.test(sanitizedPhone)) {
    return { isValid: false, error: 'Please enter a valid Philippine phone number starting with 09 or +639 followed by 9 digits' };
  }

  return { isValid: true };
};

// Car model validation
export const validateCarModel = (model: string): ValidationResult => {
  if (!model || typeof model !== 'string') {
    return { isValid: false, error: 'Car model is required' };
  }

  const sanitizedModel = model.trim();
  
  if (sanitizedModel.length < 2) {
    return { isValid: false, error: 'Car model must be at least 2 characters long' };
  }

  if (sanitizedModel.length > 100) {
    return { isValid: false, error: 'Car model is too long (maximum 100 characters)' };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedModel)) {
      return { isValid: false, error: 'Car model contains invalid characters' };
    }
  }

  return { isValid: true };
};

// Motorcycle model validation
export const validateMotorcycleModel = (model: string): ValidationResult => {
  if (!model || typeof model !== 'string') {
    return { isValid: false, error: 'Motorcycle model is required' };
  }

  const sanitizedModel = model.trim();
  
  if (sanitizedModel.length < 2) {
    return { isValid: false, error: 'Motorcycle model must be at least 2 characters long' };
  }

  if (sanitizedModel.length > 100) {
    return { isValid: false, error: 'Motorcycle model is too long (maximum 100 characters)' };
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitizedModel)) {
      return { isValid: false, error: 'Motorcycle model contains invalid characters' };
    }
  }

  return { isValid: true };
};

// Cost validation
export const validateCost = (cost: number | string): ValidationResult => {
  const numericCost = typeof cost === 'string' ? parseFloat(cost) : cost;
  
  if (isNaN(numericCost)) {
    return { isValid: false, error: 'Cost must be a valid number' };
  }

  if (numericCost < 0) {
    return { isValid: false, error: 'Cost cannot be negative' };
  }

  if (numericCost > 100000) {
    return { isValid: false, error: 'Cost seems unusually high. Please verify the amount' };
  }

  return { isValid: true };
};

// Car size validation
export const validateCarSize = (size: string): ValidationResult => {
  const validSizes = ['small', 'medium', 'large', 'extra_large'];
  
  if (!size || !validSizes.includes(size)) {
    return { isValid: false, error: 'Please select a valid car size' };
  }

  return { isValid: true };
};

// Motorcycle size validation
export const validateMotorcycleSize = (size: string): ValidationResult => {
  const validSizes = ['small', 'large'];
  
  if (!size || !validSizes.includes(size)) {
    return { isValid: false, error: 'Please select a valid motorcycle size' };
  }

  return { isValid: true };
};

// Service status validation
export const validateServiceStatus = (status: string): ValidationResult => {
  const validStatuses = ['waiting', 'in-progress', 'payment-pending', 'completed', 'cancelled'];
  
  if (!status || !validStatuses.includes(status)) {
    return { isValid: false, error: 'Please select a valid status' };
  }

  return { isValid: true };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

// UUID validation for database IDs
export const validateUUID = (id: string): ValidationResult => {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'Invalid ID format' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return { isValid: false, error: 'Invalid ID format' };
  }

  return { isValid: true };
};

// Crew validation for different statuses
export const validateCrewForStatus = (status: string, crew: string[], hasPackage: boolean = false): ValidationResult => {
  if (!status || typeof status !== 'string') {
    return { isValid: false, error: 'Status is required for crew validation' };
  }

  if (!Array.isArray(crew)) {
    return { isValid: false, error: 'Crew must be an array' };
  }

  // For 'in-progress' status, crew is required unless a package is selected
  if (status === 'in-progress') {
    if (!hasPackage && crew.length === 0) {
      return { isValid: false, error: 'At least one crew member must be assigned when status is "In Progress" and no package is selected.' };
    }
  }

  // For 'waiting' status, crew assignment is optional
  // For other statuses, crew validation is not enforced

  return { isValid: true };
};

// Validate crew assignment based on busy status
export const validateCrewAvailability = (selectedCrewIds: string[], busyCrewIds: Set<string>): ValidationResult => {
  if (!Array.isArray(selectedCrewIds)) {
    return { isValid: false, error: 'Selected crew must be an array' };
  }

  if (!(busyCrewIds instanceof Set)) {
    return { isValid: false, error: 'Busy crew IDs must be a Set' };
  }

  const busySelectedCrew = selectedCrewIds.filter(crewId => busyCrewIds.has(crewId));
  
  if (busySelectedCrew.length > 0) {
    return { isValid: false, error: 'Some selected crew members are currently busy. Please select different crew members.' };
  }

  return { isValid: true };
};

// Check if crew selection should be enabled based on status
export const shouldEnableCrewSelection = (status: string): boolean => {
  // Crew selection is enabled for 'in-progress' status
  // Disabled for 'waiting' status in add/edit forms (only via Start Service)
  return status === 'in-progress';
};

// Check if crew selection should be required based on status and package
export const isCrewSelectionRequired = (status: string, hasPackage: boolean = false): boolean => {
  // Crew is required for 'in-progress' status unless a package is selected
  return status === 'in-progress' && !hasPackage;
};

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
} 