const mongoose = require('mongoose');

// Yeni veri yapısı: Her kayıt tüm kaynakları içerir (Elektrik_Tuketim, Su_Tuketim, Dogalgaz_Tuketim)
// Eski yapı da desteklenir (Kaynak_Tipi, Tuketim_Miktari) - geriye dönük uyumluluk için
const ReadingSchema = new mongoose.Schema({
    Mahalle: { type: String, required: true },
    Tarih: { type: Date, default: Date.now, required: true },
    
    // Yeni yapı (tercih edilen)
    Elektrik_Tuketim: { type: Number, default: 0 },
    Su_Tuketim: { type: Number, default: 0 },
    Dogalgaz_Tuketim: { type: Number, default: 0 },
    
    // Eski yapı (geriye dönük uyumluluk için - opsiyonel)
    Kaynak_Tipi: { 
        type: String, 
        enum: ['Elektrik', 'Su', 'Dogalgaz'],
        required: false // Artık zorunlu değil
    },
    Tuketim_Miktari: { type: Number, required: false },
    Birim: { type: String, required: false },
    
    Anomali_Durumu: { type: Boolean, default: false }
}, {
    // Strict mode: false - veritabanındaki ekstra alanları da kabul et
    strict: false
});

// Index'ler - performans için
ReadingSchema.index({ Mahalle: 1, Tarih: -1 });
ReadingSchema.index({ Tarih: -1 });

module.exports = mongoose.model('Reading', ReadingSchema, 'tuketim_kayitlari'); 
// Üçüncü parametre olan 'tuketim_kayitlari', MongoDB'deki koleksiyon adıyla eşleşmesini sağlar.