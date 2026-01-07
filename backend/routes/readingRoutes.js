const express = require('express');
const router = express.Router();
const { createReading } = require('../controllers/readingController');

// POST /api/readings -> Veri kaydeder
router.post('/', createReading);

module.exports = router;