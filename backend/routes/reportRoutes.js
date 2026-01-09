const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// 1. İstatistik Özeti: Aylık Rapor Oluştur
router.post('/generate/stats', protect, adminOnly, reportController.generateMonthlyStatsReport);

// 2. Zaman Serisi Analizi: Yıl Sonu Raporu
router.post('/generate/timeseries', protect, adminOnly, reportController.generateYearlyTimeSeriesReport);

// 3. Korelasyon: Aylık ve Mevsimsel Rapor
router.post('/generate/correlation', protect, adminOnly, reportController.generateCorrelationReport);

// 4. Tüm Raporları Listele
router.get('/list', protect, reportController.listReports);

module.exports = router;