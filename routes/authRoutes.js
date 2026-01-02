const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Kayıt Olma: POST /api/auth/register
router.post('/register', authController.register);

// Email Doğrulama: POST /api/auth/verify
router.post('/verify', authController.verifyEmail);

module.exports = router;