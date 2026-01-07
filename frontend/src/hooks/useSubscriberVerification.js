/**
 * useSubscriberVerification Hook
 * 
 * A custom React hook to manage the email verification flow for subscribers.
 * This hook provides a clean interface for integrating email verification
 * into subscriber registration components.
 * 
 * Usage:
 *   const { initiateVerification, isVerifying, error } = useSubscriberVerification();
 *   
 *   const handleRegister = async (subscriberData) => {
 *     const result = await initiateVerification(subscriberData);
 *     if (result.success) {
 *       // Show verification component
 *     }
 *   };
 */

import { useState } from 'react';
import api from '../services/api';

const useSubscriberVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(null);
  const [pendingSubscriberData, setPendingSubscriberData] = useState(null);

  /**
   * Initiates the email verification process for subscribers
   * 
   * @param {object} subscriberData - { name, surname, email, neighborhood }
   * @returns {Promise<{success: boolean, email?: string, error?: string}>}
   */
  const initiateVerification = async (subscriberData) => {
    setIsVerifying(true);
    setError('');
    setVerificationEmail(null);
    setPendingSubscriberData(subscriberData);

    try {
      const response = await api.post('/verification/subscriber/initiate', {
        name: subscriberData.name,
        surname: subscriberData.surname,
        email: subscriberData.email,
        neighborhood: subscriberData.neighborhood
      });

      if (response.data && response.data.success) {
        setVerificationEmail(response.data.email);
        return {
          success: true,
          email: response.data.email
        };
      } else {
        const errorMsg = response.data?.message || 'Doğrulama başlatılamadı.';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (err) {
      console.error('Verification initiation error:', err);
      const errorMsg = err.response?.data?.message || 
        err.message || 
        'Bir hata oluştu. Lütfen tekrar deneyin.';
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
   * Verifies the code and returns subscriber data
   * 
   * @param {string} email - Email address
   * @param {string} code - Verification code
   * @returns {Promise<{success: boolean, subscriberData?: object, error?: string}>}
   */
  const verifyCode = async (email, code) => {
    try {
      const response = await api.post('/verification/subscriber/verify', {
        email,
        code
      });

      if (response.data.success) {
        return {
          success: true,
          subscriberData: response.data.subscriberData
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Doğrulama başarısız.'
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
   * Resends the verification code
   * 
   * @param {string} email - Email address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const resendCode = async (email) => {
    try {
      const response = await api.post('/verification/subscriber/resend', { email });
      
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
    setPendingSubscriberData(null);
  };

  return {
    initiateVerification,
    verifyCode,
    resendCode,
    reset,
    isVerifying,
    error,
    verificationEmail,
    pendingSubscriberData
  };
};

export default useSubscriberVerification;

