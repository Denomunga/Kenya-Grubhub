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
    if (!encryptedText || typeof encryptedText !== 'string') {
      return false;
    }
    
    // Basic checks for encrypted format
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(encryptedText)) return false;
    
    // Check minimum length (encrypted messages should be longer due to IV)
    if (encryptedText.length < 24) return false; // Minimum for 16-byte IV + some data
    
    // Try to parse as Base64
    const parsed = CryptoJS.enc.Base64.parse(encryptedText);
    if (parsed.sigBytes < 16) return false; // At least 16 bytes for IV
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generates a secure key for thread-specific encryption
 * @param threadId - The thread ID
 * @param userId - The user ID
 * @returns Thread-specific encryption key
 */
export function generateThreadKey(threadId: string, userId: string): string {
  return CryptoJS.SHA256(`${threadId}:${userId}:${ENCRYPTION_KEY}`).toString();
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
