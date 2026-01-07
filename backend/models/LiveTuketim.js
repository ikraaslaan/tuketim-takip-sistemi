const mongoose = require('mongoose');

const LiveTuketimSchema = new mongoose.Schema({
  Mahalle: { type: String },
  // Resimdeki veritabanı alan isimlerinin aynısı (Alt çizgilere dikkat!)
  Elektrik_Tuketim: { type: Number }, 
  Su_Tuketim: { type: Number },
  Dogalgaz_Tuketim: { type: Number },
  Tarih: { type: Date }
}, { 
  collection: 'tuketim_kayitlari' // RESİMDEKİ KLASÖR ADIN
});

module.exports = mongoose.model('LiveTuketim', LiveTuketimSchema);