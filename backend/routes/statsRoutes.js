const express = require('express');
const router = express.Router();

// Controller dosyasını çağırıyoruz
// DİKKAT: Süslü parantez içindeki isim Controller'dakiyle BİREBİR AYNI olmalı.
const { getDashboardStats, getTimeSeries } = require('../controllers/statsController');

// Kontrol: Eğer fonksiyon undefined gelirse hata fırlatmadan önce uyaralım (Debug için)
if (!getDashboardStats) {
    console.error("❌ HATA: statsController içinden 'getDashboardStats' fonksiyonu okunamadı!");
    console.error("Lütfen backend/controllers/statsController.js dosyasını kontrol et.");
}

// GET /api/stats/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/stats/timeseries
router.get('/timeseries', getTimeSeries);

module.exports = router;