const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    Mahalle: { type: String, required: true },
    Kaynak_Tipi: { type: String, enum: ['Elektrik', 'Su', 'Dogalgaz', 'Doğalgaz'], required: true },
    Tip: { type: String, enum: ['Planlı', 'Anlık', 'PLANLI', 'ANLIK'], required: true },
    Baslangic_Tarihi: { type: Date, required: true },
    Bitis_Tarihi: { type: Date }, // Planlı kesintiler için
    Durum: { type: String, enum: ['Aktif', 'Pasif', 'Cozuldu', 'AKTIF', 'PASIF', 'COZULDU'], default: 'Pasif' },
    Aciklama: { type: String, default: 'Anlık arıza bildirimi' }
});

module.exports = mongoose.model('Incident', IncidentSchema);