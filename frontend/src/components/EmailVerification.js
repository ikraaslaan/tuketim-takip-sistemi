/**
 * Email Verification Component
 * 
 * A modular component for email verification during user registration.
 * This component can be used independently or integrated into existing flows.
 * 
 * Props:
 *   - email: string (required) - The email address to verify
 *   - onVerificationSuccess: function (required) - Callback when verification succeeds
 *   - onCancel: function (optional) - Callback to cancel verification
 *   - onResend: function (optional) - Custom resend handler
 *   - verifyEndpoint: string (optional) - Custom verification endpoint (default: '/verification/verify')
 *   - resendEndpoint: string (optional) - Custom resend endpoint (default: '/verification/resend')
 *   - successMessage: string (optional) - Custom success message
 * 
 * Usage:
 *   <EmailVerification
 *     email={userEmail}
 *     onVerificationSuccess={(data) => {
 *       console.log('Verified:', data);
 *       // Navigate to success page or login
 *     }}
 *     onCancel={() => {
 *       // Handle cancel
 *     }}
 *   />
 */

import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const EmailVerification = ({ 
  email, 
  onVerificationSuccess, 
  onCancel, 
  onResend,
  verifyEndpoint = '/verification/verify',
  resendEndpoint = '/verification/resend',
  successMessage = 'Doğrulama Başarılı!'
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Input refs for code entry
  const inputRefs = [];

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs[0]) {
      inputRefs[0].focus();
    }
  }, []);

  // Handle code input
  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5 && inputRefs[index + 1]) {
      inputRefs[index + 1].focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newCode = [...code];
      digits.forEach((digit, index) => {
        if (index < 6) {
          newCode[index] = digit;
        }
      });
      setCode(newCode);
      
      // Focus last input
      if (inputRefs[5]) {
        inputRefs[5].focus();
      }
      
      // Auto-verify
      setTimeout(() => {
        handleVerify(pastedData);
      }, 100);
    }
  };

  // Verify code
  const handleVerify = async (verificationCode = null) => {
    const codeToVerify = verificationCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post(verifyEndpoint, {
        email,
        code: codeToVerify
      });

      if (response.data && response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onVerificationSuccess) {
            // Pass the full response data (could be user, subscriberData, etc.)
            onVerificationSuccess(response.data.user || response.data.subscriberData || response.data);
          }
        }, 1500);
      } else {
        setError(response.data?.message || 'Doğrulama başarısız. Lütfen tekrar deneyin.');
        setCode(['', '', '', '', '', '']);
        if (inputRefs[0]) {
          inputRefs[0].focus();
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || 
        error.message || 
        'Doğrulama kodu geçersiz. Lütfen tekrar deneyin.';
      setError(errorMessage);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      if (inputRefs[0]) {
        inputRefs[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setError('');

    try {
      if (onResend) {
        // Use custom resend handler if provided
        await onResend();
        setResendCooldown(60); // 60 second cooldown
        setError('');
      } else {
        // Default: call API
        const response = await api.post(resendEndpoint, { email });
        if (response.data && response.data.success) {
          setResendCooldown(60); // 60 second cooldown
          setError('');
        } else {
          setError(response.data?.message || 'Kod gönderilemedi.');
        }
      }
    } catch (error) {
      console.error('Resend error:', error);
      const errorMessage = error.response?.data?.message || 
        error.message ||
        'Kod gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-full mb-4">
            <Mail className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            E-posta Doğrulama
          </h2>
          <p className="text-white/80 text-sm">
            <span className="text-emerald-400 font-medium">{email}</span> adresine gönderilen
            <br />
            6 haneli doğrulama kodunu giriniz.
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <p className="text-white text-lg font-semibold mb-2">
              {successMessage}
            </p>
            <p className="text-white/70 text-sm">
              Yönlendiriliyorsunuz...
            </p>
          </div>
        ) : (
          <>
            {/* Code Input */}
            <div className="mb-6">
              <div className="flex justify-center gap-3 mb-4">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/10 text-white border-2 border-white/30 rounded-xl focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="text-center text-white/60 text-sm mb-4">
                  Doğrulanıyor...
                </div>
              )}
            </div>

            {/* Resend Code */}
            <div className="text-center mb-6">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending || isLoading}
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium disabled:text-white/40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>Tekrar gönder ({resendCooldown}s)</span>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Kodu Tekrar Gönder</span>
                  </>
                )}
              </button>
            </div>

            {/* Manual Verify Button (fallback) */}
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={isLoading || code.some(digit => !digit)}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
            </button>

            {/* Cancel Button */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>İptal</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;

