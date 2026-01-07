const express = require('express');
const router = express.Router();
const { getUnreadNotifications, notifyNeighborhoodUsers } = require('../controllers/notificationController');

router.get('/unread', getUnreadNotifications);
router.post('/notify-neighborhood', notifyNeighborhoodUsers);

module.exports = router;