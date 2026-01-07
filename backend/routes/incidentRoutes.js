const express = require('express');
const router = express.Router();

// 1. Controller'dan fonksiyonları çekiyoruz
// Buraya 'getLiveDashboardData' fonksiyonunu ekledik!
const { 
    getIncidents, 
    createPlannedOutage, 
    createInstantIncident, 
    resolveIncident,
    getSystemAlerts,
    simulateAutoAlarm,
    getLiveDashboardData // <--- YENİ EKLENEN (Controller'da yazdığımız fonksiyon)
} = require('../controllers/incidentController');

// 2. Rotaları Tanımlıyoruz

// --- ÖZEL ROTALAR (En Üste) ---
// Sistem önce bu özel adresleri kontrol etsin diye en başa yazıyoruz.

// Bildirim çubuğu için alarm kontrolü
router.get('/alerts', getSystemAlerts); 

// YENİ: Canlı veritabanı verilerini çeken rota (Mahalleler sayfası için)
router.get('/live-dashboard', getLiveDashboardData); 


// --- GENEL ROTALAR ---
router.get('/', getIncidents);
router.post('/planned', createPlannedOutage); 
router.post('/instant', createInstantIncident); 
router.put('/:id/coz', resolveIncident); // Turkish route
router.put('/:id/resolve', resolveIncident); // English route alias 

module.exports = router;