import CryptoJS from 'crypto-js';

// Encryption key should be stored securely in environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Encrypts a message using AES encryption
 * @param text - The plain text message to encrypt
 * @returns Encrypted string
 */
export function encryptMessage(text: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using AES encryption
 * @param encryptedText - The encrypted message
 * @returns Decrypted plain text message
 */
export function decryptMessage(encryptedText: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Decryption resulted in empty text');
    }
    return decryptedText;
  } catch (error) {
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Validates if a string is properly encrypted
 * @param encryptedText - The encrypted string to validate
 * @returns True if valid encrypted format
 */
export function isValidEncryptedFormat(encryptedText: string): boolean {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return false;
    }
    
    // Check if it starts with the CryptoJS AES prefix
    if (!encryptedText.startsWith('U2FsdGVkX1')) {
      return false;
    }
    
    // Try to decrypt a test string to see if it's valid
    try {
      const testDecrypt = CryptoJS.AES.decrypt(encryptedText, 'test-key');
      // If it doesn't throw an error, it's valid format
      return true;
    } catch (e) {
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Generates a secure key for thread-specific encryption (individual user key)
 * @param threadId - The thread ID
 * @param userId - The user ID
 * @returns Thread-specific encryption key for individual user
 */
export function generateThreadKey(threadId: string, userId: string): string {
  return CryptoJS.SHA256(`${threadId}:${userId}:${ENCRYPTION_KEY}`).toString();
}

/**
 * Generates a shared thread key that all participants can use
 * @param threadId - The thread ID
 * @returns Shared thread encryption key
 */
export function generateSharedThreadKey(threadId: string): string {
  return CryptoJS.SHA256(`${threadId}:shared:${ENCRYPTION_KEY}`).toString();
}

/**
 * Encrypts a message for a specific recipient in a thread
 * @param text - The plain text message
 * @param threadId - The thread ID
 * @param recipientId - The recipient user ID
 * @returns Recipient-specific encrypted message
 */
export function encryptMessageForRecipient(text: string, threadId: string, recipientId: string): string {
  const recipientKey = generateThreadKey(threadId, recipientId);
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, recipientKey);
    return encrypted.toString();
  } catch (error) {
    console.error('Recipient encryption error:', error);
    throw new Error('Failed to encrypt message for recipient');
  }
}

/**
 * Decrypts a message for a specific recipient in a thread
 * @param encryptedText - The encrypted message
 * @param threadId - The thread ID
 * @param recipientId - The recipient user ID
 * @returns Decrypted plain text message
 */
export function decryptMessageForRecipient(encryptedText: string, threadId: string, recipientId: string): string {
  // Check if this is a legacy plain text message (not encrypted)
  if (!isValidEncryptedFormat(encryptedText)) {
    // Return as-is for legacy messages
    return encryptedText;
  }
  
  const recipientKey = generateThreadKey(threadId, recipientId);
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, recipientKey);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    // If decryption results in empty text, it means the key doesn't match
    // This can happen if the message was encrypted with a different key
    if (!decryptedText) {
      throw new Error('Recipient decryption resulted in empty text - key mismatch');
    }
    
    return decryptedText;
  } catch (error: any) {
    // Silent error - let caller handle fallback
    throw new Error('Failed to decrypt message for recipient: ' + error.message);
  }
}

/**
 * Generates an admin master key for thread monitoring
 * @param threadId - The thread ID
 * @returns Admin master key for the thread
 */
export function generateAdminMasterKey(threadId: string): string {
  return CryptoJS.SHA256(`${threadId}:admin:master:${ENCRYPTION_KEY}`).toString();
}

/**
 * Encrypts a message for admin monitoring
 * @param text - The plain text message
 * @param threadId - The thread ID
 * @returns Admin-encrypted message
 */
export function encryptMessageForAdmin(text: string, threadId: string): string {
  const adminKey = generateAdminMasterKey(threadId);
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, adminKey);
    return encrypted.toString();
  } catch (error) {
    console.error('Admin encryption error:', error);
    throw new Error('Failed to encrypt message for admin');
  }
}

/**
 * Decrypts a message for admin monitoring
 * @param encryptedText - The encrypted message
 * @param threadId - The thread ID
 * @returns Decrypted plain text message
 */
export function decryptMessageForAdmin(encryptedText: string, threadId: string): string {
  // Check if this is a legacy plain text message (not encrypted)
  if (!isValidEncryptedFormat(encryptedText)) {
    // Return as-is for legacy messages
    return encryptedText;
  }
  
  const adminKey = generateAdminMasterKey(threadId);
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, adminKey);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Admin decryption resulted in empty text');
    }
    
    return decryptedText;
  } catch (error) {
    console.error('Admin decryption error:', error);
    throw new Error('Failed to decrypt message for admin');
  }
}

/**
 * Encrypts a message for a specific thread
 * @param text - The plain text message
 * @param threadId - The thread ID
 * @param userId - The user ID
 * @returns Thread-specific encrypted message
 */
export function encryptMessageForThread(text: string, threadId: string, userId: string): string {
  const threadKey = generateThreadKey(threadId, userId);
  
  try {
    const encrypted = CryptoJS.AES.encrypt(text, threadKey);
    return encrypted.toString();
  } catch (error) {
    console.error('Thread encryption error:', error);
    throw new Error('Failed to encrypt message for thread');
  }
}

/**
 * Decrypts a message for a specific thread
 * @param encryptedText - The encrypted message
 * @param threadId - The thread ID
 * @param userId - The user ID
 * @returns Decrypted plain text message
 */
export function decryptMessageForThread(encryptedText: string, threadId: string, userId: string): string {
  // Check if this is a legacy plain text message (not encrypted)
  if (!isValidEncryptedFormat(encryptedText)) {
    // Return as-is for legacy messages
    return encryptedText;
  }
  
  const threadKey = generateThreadKey(threadId, userId);
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, threadKey);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Thread decryption resulted in empty text');
    }
    
    return decryptedText;
  } catch (error) {
    console.error('Thread decryption error:', error);
    throw new Error('Failed to decrypt message for thread');
  }
}
