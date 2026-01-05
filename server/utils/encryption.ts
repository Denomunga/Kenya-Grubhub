import CryptoJS from 'crypto-js';

// Encryption key should be stored securely in environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Encrypts a message using AES encryption
 * @param text - The plain text message to encrypt
 * @returns Encrypted string with IV prepended
 */
export function encryptMessage(text: string): string {
  try {
    const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using AES encryption
 * @param encryptedText - The encrypted message with IV prepended
 * @returns Decrypted plain text message
 */
export function decryptMessage(encryptedText: string): string {
  try {
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    // Extract IV (first 16 bytes) and ciphertext
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      ENCRYPTION_KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Decryption resulted in empty text');
    }
    
    return decryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
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
    console.log('Validating encrypted format:', encryptedText);
    console.log('Length:', encryptedText.length);
    
    if (!encryptedText || typeof encryptedText !== 'string') {
      console.log('Failed: not a string');
      return false;
    }
    
    // Basic checks for encrypted format
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    const isBase64 = base64Regex.test(encryptedText);
    console.log('Is base64 format:', isBase64);
    if (!isBase64) {
      console.log('Failed: not base64 format');
      return false;
    }
    
    // Check minimum length (encrypted messages should be longer due to IV)
    if (encryptedText.length < 24) {
      console.log('Failed: too short (< 24 chars)');
      return false; // Minimum for 16-byte IV + some data
    }
    
    // Try to parse as Base64
    const parsed = CryptoJS.enc.Base64.parse(encryptedText);
    console.log('Parsed sigBytes:', parsed.sigBytes);
    if (parsed.sigBytes < 16) {
      console.log('Failed: parsed bytes < 16');
      return false; // At least 16 bytes for IV
    }
    
    console.log('Passed validation as encrypted format');
    return true;
  } catch (error) {
    console.log('Failed with error:', error);
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
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, recipientKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
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
  console.log('Input encrypted text:', encryptedText);
  console.log('Is valid encrypted format:', isValidEncryptedFormat(encryptedText));
  
  // Check if this is a legacy plain text message (not encrypted)
  if (!isValidEncryptedFormat(encryptedText)) {
    // Return as-is for legacy messages
    console.log('Message is not in encrypted format, returning as plain text');
    return encryptedText;
  }
  
  const recipientKey = generateThreadKey(threadId, recipientId);
  console.log('Attempting recipient decryption with key:', recipientKey.substring(0, 10) + '...');
  
  try {
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      recipientKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    console.log('Decrypted text length:', decryptedText.length, 'content:', decryptedText);
    
    if (!decryptedText) {
      throw new Error('Recipient decryption resulted in empty text');
    }
    
    return decryptedText;
  } catch (error) {
    console.error('Recipient decryption error:', error);
    throw new Error('Failed to decrypt message for recipient');
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
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, adminKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
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
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      adminKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
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
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, threadKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const combined = iv.concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
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
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      threadKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
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
