const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    Mahalle: { type: String, required: true },
    Kaynak_Tipi: { type: String, enum: ['Elektrik', 'Su', 'Dogalgaz'], required: true },
    Baslangic_Tarihi: { type: Date, default: Date.now },
    Durum: { type: String, enum: ['Devam Ediyor', 'Cozuldu'], default: 'Devam Ediyor' },
    Aciklama: { type: String }
});

module.exports = mongoose.model('Incident', IncidentSchema);