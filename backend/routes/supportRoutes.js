// backend/routes/supportRoutes.js

const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// POST /api/support/report - Report malfunction
router.post('/report', supportController.reportMalfunction);

module.exports = router;



