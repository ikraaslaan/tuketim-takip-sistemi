/**
 * User Storage Setup Module
 * 
 * This module provides the structure and utilities for user persistence.
 * Currently, the system uses MongoDB with Mongoose (User model).
 * This file serves as documentation and setup guide for the persistence layer.
 * 
 * The actual user storage is handled by:
 * - models/User.js (Mongoose schema)
 * - controllers/verificationController.js (user creation after verification)
 * 
 * This file can be extended to support:
 * - File-based storage (JSON, CSV)
 * - Additional database options
 * - User data migration utilities
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * User Storage Structure
 * 
 * Current MongoDB Schema (from models/User.js):
 * {
 *   username: String (required, unique)
 *   password: String (required, hashed)
 *   email: String (optional - may need to be added to schema)
 *   role: String (enum: ['admin', 'kullanici'], default: 'admin')
 *   createdAt: Date (default: Date.now)
 * }
 */

/**
 * Validates user data before storage
 * 
 * @param {object} userData - User data to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
const validateUserData = (userData) => {
  const errors = [];

  if (!userData.username || userData.username.trim().length < 3) {
    errors.push('Kullanıcı adı en az 3 karakter olmalıdır.');
  }

  if (!userData.password || userData.password.length < 6) {
    errors.push('Şifre en az 6 karakter olmalıdır.');
  }

  if (!userData.email) {
    errors.push('E-posta adresi gereklidir.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      errors.push('Geçerli bir e-posta adresi giriniz.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Prepares user data for storage (hashes password, sets defaults)
 * 
 * @param {object} userData - Raw user data
 * @returns {Promise<object>} - Prepared user data ready for storage
 */
const prepareUserData = async (userData) => {
  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  return {
    username: userData.username.trim(),
    password: hashedPassword,
    email: userData.email.toLowerCase().trim(),
    role: userData.role || 'kullanici',
    createdAt: new Date()
  };
};

/**
 * Stores user data in the database
 * 
 * @param {object} userData - Validated and prepared user data
 * @returns {Promise<object>} - Created user object
 */
const storeUser = async (userData) => {
  try {
    const preparedData = await prepareUserData(userData);
    const user = await User.create(preparedData);
    
    // Return user without password
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Bu kullanıcı adı veya e-posta adresi zaten kayıtlı.');
    }
    throw error;
  }
};

/**
 * Checks if a user exists by username or email
 * 
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @returns {Promise<object>} - { exists: boolean, field?: string }
 */
const checkUserExists = async (username, email) => {
  const userByUsername = await User.findOne({ username });
  if (userByUsername) {
    return { exists: true, field: 'username' };
  }

  const userByEmail = await User.findOne({ email });
  if (userByEmail) {
    return { exists: true, field: 'email' };
  }

  return { exists: false };
};

/**
 * NOTE: To add email field to User model (if not already present):
 * 
 * Update models/User.js to include:
 * 
 * email: {
 *   type: String,
 *   required: true,
 *   unique: true,
 *   lowercase: true,
 *   trim: true
 * }
 */

module.exports = {
  validateUserData,
  prepareUserData,
  storeUser,
  checkUserExists
};

