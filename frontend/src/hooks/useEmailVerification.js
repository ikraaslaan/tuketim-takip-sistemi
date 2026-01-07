/**
 * useEmailVerification Hook
 * 
 * A custom React hook to manage the email verification flow.
 * This hook provides a clean interface for integrating email verification
 * into existing registration components without modifying them.
 * 
 * Usage:
 *   const { initiateVerification, isVerifying, error } = useEmailVerification();
 *   
 *   const handleRegister = async (userData) => {
 *     const result = await initiateVerification(userData);
 *     if (result.success) {
 *       // Show verification component
 *     }
 *   };
 */

import { useState } from 'react';
import api from '../services/api';

const useEmailVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(null);
  const [pendingUserData, setPendingUserData] = useState(null);

  /**
   * Initiates the email verification process
   * 
   * @param {object} userData - { username, password, email }
   * @returns {Promise<{success: boolean, email?: string, error?: string}>}
   */
  const initiateVerification = async (userData) => {
    setIsVerifying(true);
    setError('');
    setVerificationEmail(null);
    setPendingUserData(userData);

    try {
      const response = await api.post('/verification/initiate', {
        username: userData.username,
        password: userData.password,
        email: userData.email
      });

      if (response.data.success) {
        setVerificationEmail(response.data.email);
        return {
          success: true,
          email: response.data.email
        };
      } else {
        const errorMsg = response.data.message || 'Doğrulama başlatılamadı.';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Resends the verification code
   * 
   * @param {string} email - Email address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const resendCode = async (email) => {
    try {
      const response = await api.post('/verification/resend', { email });
      
      if (response.data.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || 'Kod gönderilemedi.'
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'Bir hata oluştu.'
      };
    }
  };

  /**
   * Clears the verification state
   */
  const reset = () => {
    setIsVerifying(false);
    setError('');
    setVerificationEmail(null);
    setPendingUserData(null);
  };

  return {
    initiateVerification,
    resendCode,
    reset,
    isVerifying,
    error,
    verificationEmail,
    pendingUserData
  };
};

export default useEmailVerification;

