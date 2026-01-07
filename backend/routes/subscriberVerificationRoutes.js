/**
 * Subscriber Verification Routes
 * 
 * Routes for subscriber email verification endpoints:
 * - POST /api/verification/subscriber/initiate - Start verification process
 * - POST /api/verification/subscriber/verify - Verify code
 * - POST /api/verification/subscriber/resend - Resend verification code
 */

const express = require('express');
const router = express.Router();
const {
  initiateSubscriberVerification,
  verifySubscriberCode,
  resendSubscriberCode
} = require('../controllers/subscriberVerificationController');

// POST /api/verification/subscriber/initiate
// Initiates subscriber email verification process
router.post('/initiate', initiateSubscriberVerification);

// POST /api/verification/subscriber/verify
// Verifies subscriber code
router.post('/verify', verifySubscriberCode);

// POST /api/verification/subscriber/resend
// Resends verification code
router.post('/resend', resendSubscriberCode);

module.exports = router;

