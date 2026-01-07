const mongoose = require('mongoose');

const ActiveAlarmSchema = new mongoose.Schema({
  // --- 1. Python Kodunun Gönderdiği Alanlar (Büyük Harfli) ---
  Mahalle: { type: String },
  Kaynak: { type: String },     // Elektrik, Su, Doğalgaz
  Mesaj: { type: String },      // Arıza açıklaması burada
  Durum: { type: String },      // 'BEKLIYOR' vb.
  Tarih: { type: Date },

  // --- 2. Eski Alanlar (Yedek olarak kalsın) ---
  mahalle: { type: String },
  tur: { type: String },
  aciklama: { type: String },
  seviye: { type: String },
  
  createdAt: { type: Date, default: Date.now }
}, { 
  collection: 'aktif_alarmlar', // Koleksiyon adı doğru olmalı
  strict: false                 // ÖNEMLİ: Şemada olmayan alanlar varsa onları da getirir
});

module.exports = mongoose.model('ActiveAlarm', ActiveAlarmSchema);