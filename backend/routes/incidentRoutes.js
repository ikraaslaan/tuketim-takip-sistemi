const express = require('express');
const router = express.Router();
const { generateRandomIncident } = require('../utils/simulation');
const { protect, adminOnly } = require('../middleware/authMiddleware'); // Middleware'leri çağır

// Kesinti tetiklemek için: POST /api/incidents/simulate
// Önce giriş kontrolü (protect), sonra rol kontrolü (adminOnly)
router.post('/simulate', protect, adminOnly, async (req, res) => {
    const incident = await generateRandomIncident();
    res.json({ message: "Kesinti simulasyonu basarili", data: incident });
});

module.exports = router;