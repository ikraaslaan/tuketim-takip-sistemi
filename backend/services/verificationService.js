/**
 * Verification Service Module
 * 
 * This module handles verification code generation, storage, and validation.
 * Uses in-memory storage for development. Can be extended to use Redis
 * or database for production.
 * 
 * Usage:
 *   const verificationService = require('./services/verificationService');
 *   const code = await verificationService.generateAndStoreCode(email, userData);
 *   const isValid = await verificationService.validateCode(email, code);
 */

// In-memory storage for verification codes
// Format: { email: { code: '123456', expiresAt: Date, userData: {...} } }
const verificationStore = new Map();

// Code expiration time: 10 minutes
const CODE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Generates a random 6-digit verification code
 * 
 * @returns {string} - A 6-digit code
 */
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generates a verification code and stores it with user data
 * 
 * @param {string} email - User's email address
 * @param {object} userData - User registration data (username, password, email)
 * @returns {Promise<string>} - The generated verification code
 */
const generateAndStoreCode = async (email, userData) => {
  // Remove any existing code for this email
  verificationStore.delete(email);

  // Generate new code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MS);

  // Store code with expiration and user data
  // Store the entire userData object to support both user and subscriber verification
  verificationStore.set(email, {
    code,
    expiresAt,
    userData: { ...userData }, // Store all data passed in
    createdAt: new Date()
  });

  // Cleanup expired codes periodically (every 5 minutes)
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupExpiredCodes, 5 * 60 * 1000);
  }

  return code;
};

/**
 * Validates a verification code for the given email
 * 
 * @param {string} email - User's email address
 * @param {string} code - The verification code to validate
 * @returns {Promise<{valid: boolean, userData?: object}>} - Validation result and user data if valid
 */
const validateCode = async (email, code) => {
  const stored = verificationStore.get(email);

  if (!stored) {
    return { valid: false, error: 'Doğrulama kodu bulunamadı veya süresi dolmuş.' };
  }

  // Check if code has expired
  if (new Date() > stored.expiresAt) {
    verificationStore.delete(email);
    return { valid: false, error: 'Doğrulama kodu süresi dolmuş. Lütfen yeni bir kod isteyin.' };
  }

  // Check if code matches
  if (stored.code !== code) {
    return { valid: false, error: 'Geçersiz doğrulama kodu.' };
  }

  // Code is valid - return user data and remove from store
  const userData = { ...stored.userData };
  verificationStore.delete(email);

  return { valid: true, userData };
};

/**
 * Removes expired codes from storage
 */
const cleanupExpiredCodes = () => {
  const now = new Date();
  for (const [email, data] of verificationStore.entries()) {
    if (now > data.expiresAt) {
      verificationStore.delete(email);
    }
  }
};

/**
 * Gets stored verification data for an email (for debugging)
 * 
 * @param {string} email - User's email address
 * @returns {object|null} - Stored verification data or null
 */
const getStoredData = (email) => {
  return verificationStore.get(email) || null;
};

let cleanupInterval = null;

// Cleanup on process exit
process.on('SIGTERM', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});

process.on('SIGINT', () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
});

module.exports = {
  generateAndStoreCode,
  validateCode,
  getStoredData,
  cleanupExpiredCodes
};

