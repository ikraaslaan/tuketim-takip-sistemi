const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Dashboard için mahalle bazlı ortalama veriler
router.get('/dashboard', statsController.getDashboardStats);

// Zaman serisi verileri (son 7 gün)
router.get('/timeseries', statsController.getTimeSeries);

// Test endpoint - veritabanı kontrolü
router.get('/test', statsController.testDatabase);

module.exports = router;
