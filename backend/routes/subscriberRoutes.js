const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');

router.post('/', subscriberController.createSubscriber);
router.get('/', subscriberController.getSubscribers);

module.exports = router;
