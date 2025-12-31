const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');

// Haftalık ortalamalar için: /api/readings/weekly-averages
router.get('/weekly-averages', readingController.getWeeklyAverages);

// Mahalle araması için: /api/readings/search?query=Sanayi
router.get('/search', readingController.searchNeighborhoods);

module.exports = router;