/**
 * Verification Routes
 * 
 * Routes for email verification endpoints:
 * - POST /api/verification/initiate - Start verification process
 * - POST /api/verification/verify - Verify code and create account
 * - POST /api/verification/resend - Resend verification code
 */

const express = require('express');
const router = express.Router();
const {
  initiateVerification,
  verifyCode,
  resendCode
} = require('../controllers/verificationController');

// POST /api/verification/initiate
// Initiates email verification process
router.post('/initiate', initiateVerification);

// POST /api/verification/verify
// Verifies code and creates user account
router.post('/verify', verifyCode);

// POST /api/verification/resend
// Resends verification code
router.post('/resend', resendCode);

module.exports = router;

