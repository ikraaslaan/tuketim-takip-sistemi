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

// Aktif Arızaları Listeleme
router.get('/active', protect, incidentController.getActiveIncidents);

// Live Dashboard - Mahalle bazlı aktif arızalar
router.get('/live-dashboard', incidentController.getLiveDashboard);

// Arıza Çözme (Middleware kaldırıldı - frontend'den direkt erişim için)
router.put('/:id/coz', incidentController.resolveIncident);

// Eski simülasyon rotamız
router.post('/simulate', protect, adminOnly, async (req, res) => {
    const incident = await generateRandomIncident();
    res.json({ message: "Simülasyon başarılı", data: incident });
});

module.exports = router;