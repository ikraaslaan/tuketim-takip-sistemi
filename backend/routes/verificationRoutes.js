const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

// Subscriber verification endpoints
router.post('/subscriber/initiate', verificationController.initiateSubscriberVerification);
router.post('/subscriber/verify', verificationController.verifySubscriberCode);
router.post('/subscriber/resend', verificationController.resendSubscriberCode);

module.exports = router;
