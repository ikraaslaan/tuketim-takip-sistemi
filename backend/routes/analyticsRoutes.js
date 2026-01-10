const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Belgeleri listele (frontend'in beklediği format)
router.get('/documents', protect, reportController.listDocuments);

// Belge sil
router.delete('/documents/:id', protect, adminOnly, reportController.deleteDocument);

// Rapor oluştur (frontend'in beklediği format)
router.post('/generate-report', protect, adminOnly, reportController.generateReport);

// İstatistik özeti (frontend'in beklediği format)
router.get('/statistical-summary', protect, reportController.getStatisticalSummary);

// Zaman serisi analizi (frontend'in beklediği format)
router.get('/time-series', protect, reportController.getTimeSeriesAnalysis);

// Korelasyon analizi (ayrı endpoint)
router.get('/correlation', protect, reportController.getCorrelationAnalysis);

module.exports = router;
