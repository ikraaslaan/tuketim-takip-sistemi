const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');

// Haftalık ortalamalar için: /api/readings/weekly-averages
router.get('/weekly-averages', readingController.getWeeklyAverages);

// Mahalle araması için: /api/readings/search?query=Sanayi
router.get('/search', readingController.searchNeighborhoods);

// Yönetici Paneli için 30 Günlük Ortalama: /api/readings/monthly-averages
router.get('/monthly-averages', readingController.getMonthlyAverages);

module.exports = router;