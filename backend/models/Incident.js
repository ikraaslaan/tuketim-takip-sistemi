const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  Mahalle: {
    type: String,
    required: true
  },
  Kaynak_Tipi: {
    type: String,
    required: true,
    enum: ['Elektrik', 'Su', 'Dogalgaz', 'Doğalgaz'] // Doğalgaz yazım hataları için ikisini de ekledim
  },
  Tip: {
    type: String,
    // HATA ÇÖZÜMÜ: Buraya 'PLANLI' ve 'Planlı' seçeneklerini ekledik.
    // Artık frontend'den ne gelirse kabul edecek.
    enum: ['ARIZA', 'PLANLI_KESINTI', 'PLANLI', 'Planlı', 'Arıza'],
    default: 'ARIZA'
  },
  Kaynak_Kaydi: {
    type: String,
    enum: ['OTOMATIK', 'MANUEL'],
    default: 'MANUEL' // Yönetici panelinden ekliyorsan manueldir
  },
  Durum: {
    type: String,
    enum: ['AKTIF', 'PASIF', 'Aktif', 'Pasif'],
    default: 'AKTIF'
  },
  Aciklama: {
    type: String
  },
  Baslangic_Tarihi: {
    type: Date,
    default: Date.now
  },
  Bitis_Tarihi: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);