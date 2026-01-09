const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { generateRandomIncident } = require('../utils/simulation');
const { protect, adminOnly } = require('../middleware/authMiddleware');

//  Anlık Arıza Bildirimi (Sadece Admin)
router.post('/instant', protect, adminOnly, incidentController.createInstantIncident);

//  Planlı Kesinti Ekleme (Sadece Admin)
router.post('/planned', protect, adminOnly, incidentController.createPlannedIncident);

//  Planlı Kesintileri Listeleme
router.get('/planned', incidentController.getPlannedIncidents);

// Eski simülasyon rotamız
router.post('/simulate', protect, adminOnly, async (req, res) => {
    const incident = await generateRandomIncident();
    res.json({ message: "Simülasyon başarılı", data: incident });
});

module.exports = router;