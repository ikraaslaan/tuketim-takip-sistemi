const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
    Mahalle: { type: String, required: true },
    Kaynak_Tipi: { type: String, enum: ['Elektrik', 'Su', 'Dogalgaz'], required: true },
    Tuketim_Miktari: { type: Number, required: true },
    Birim: { type: String, required: true },
    Tarih: { type: Date, default: Date.now },
    Anomali_Durumu: { type: Boolean, default: false }
});

module.exports = mongoose.model('Reading', ReadingSchema, 'tuketim_kayitlari'); 
// Üçüncü parametre olan 'tuketim_kayitlari', MongoDB'deki koleksiyon adıyla eşleşmesini sağlar.