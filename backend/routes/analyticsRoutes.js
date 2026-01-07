const express = require('express');
const router = express.Router();
const {
    getStatisticalSummary,
    getTimeSeriesAnalysis,
    generateMonthlyReport,
    getDocuments,
    deleteDocument
} = require('../controllers/analyticsController');

// GET /api/analytics/statistical-summary
router.get('/statistical-summary', getStatisticalSummary);

// GET /api/analytics/time-series
router.get('/time-series', getTimeSeriesAnalysis);

// POST /api/analytics/generate-report
router.post('/generate-report', generateMonthlyReport);

// GET /api/analytics/documents
router.get('/documents', getDocuments);

// DELETE /api/analytics/documents/:id
router.delete('/documents/:id', deleteDocument);

module.exports = router;

