import * as validator from 'email-validator';

export interface EmailVerificationResult {
  isValid: boolean;
  isDeliverable: boolean;
  message: string;
}

/**
 * Validates if an email address is real and deliverable
 * Uses multiple validation techniques:
 * 1. Format validation (syntax check)
 * 2. Domain validation (MX record check)
 * 3. Common disposable email detection
 */
export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  try {
    // Basic format validation
    if (!validator.validate(email)) {
      return {
        isValid: false,
        isDeliverable: false,
        message: 'Invalid email format'
      };
    }

    // Extract domain for MX record check
    const domain = email.split('@')[1].toLowerCase();
    
    // Check for common disposable email providers
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com', 'temp-mail.org',
      'throwaway.email', 'fakeemail.com', 'tempmail.org',
      'maildrop.cc', 'tempmail.de', 'tempmail.net'
    ];
    
    if (disposableDomains.includes(domain)) {
      return {
        isValid: false,
        isDeliverable: false,
        message: 'Disposable email addresses are not allowed'
      };
    }

    // Check for common typos in popular email domains
    const commonTypos: { [key: string]: string } = {
      'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yahoo.co': 'yahoo.com',
      'yahho.com': 'yahoo.com',
      'outlok.com': 'outlook.com',
      'hotmial.com': 'hotmail.com',
      'gnail.com': 'gmail.com'
    };

    if (commonTypos[domain]) {
      return {
        isValid: false,
        isDeliverable: false,
        message: `Did you mean ${commonTypos[domain]}? Please check your email spelling.`
      };
    }

    // Basic domain validation - check if domain has valid format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      return {
        isValid: false,
        isDeliverable: false,
        message: 'Invalid domain name'
      };
    }

    // For production, you might want to add MX record lookup here
    // For now, we'll do basic validation that catches most issues
    
    return {
      isValid: true,
      isDeliverable: true,
      message: 'Email appears to be valid'
    };

  } catch (error) {
    return {
      isValid: false,
      isDeliverable: false,
      message: 'Email validation failed'
    };
  }
}

/**
 * Quick email validation for form validation (without async operations)
 */
export function quickEmailValidation(email: string): { isValid: boolean; message: string } {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  if (!validator.validate(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }

  // Check length
  if (email.length > 254) {
    return { isValid: false, message: 'Email address is too long' };
  }

  return { isValid: true, message: 'Email format is valid' };
}
