const express = require('express');
const router = express.Router();
const { getPrediction } = require('../controllers/predictionController');

// GET /api/predictions?mahalle=Sanayi
router.get('/', getPrediction);

module.exports = router;