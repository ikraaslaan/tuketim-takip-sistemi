const express = require('express');
const router = express.Router();
const { subscribe, getSubscriberByEmail } = require('../controllers/subscriberController');

router.post('/', subscribe);
router.get('/by-email', getSubscriberByEmail); // GET /api/subscribers/by-email?email=user@example.com

module.exports = router;