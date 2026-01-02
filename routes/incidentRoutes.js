const express = require('express');
const router = express.Router();
const { generateRandomIncident } = require('../utils/simulation');

// Kesinti tetiklemek için: POST /api/incidents/simulate
router.post('/simulate', async (req, res) => {
    const incident = await generateRandomIncident();
    res.json({ message: "Kesinti simulasyonu basarili", data: incident });
});

module.exports = router;