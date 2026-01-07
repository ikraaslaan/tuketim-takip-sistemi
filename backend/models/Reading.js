const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  Tarih: { type: Date, required: true },
  Mahalle: { type: String, required: true },
  Elektrik_Tuketim: { type: Number, required: true },
  Su_Tuketim: { type: Number, required: true },
  Dogalgaz_Tuketim: { type: Number, required: true }
}, { 
  collection: 'tuketim_kayitlari', // <--- BURASI MONGODB İLE BİREBİR AYNI OLMALI
  timestamps: false // Senin hazır verinde createdAt/updatedAt yoksa bunu false yapalım hata vermesin
});

// Indexes for performance optimization
// Single index on Tarih for sorting operations (descending for recent data first)
ReadingSchema.index({ Tarih: -1 });

// Compound index for queries that filter by Mahalle and sort by Tarih (descending)
// This is CRITICAL for report generation performance - filters by neighborhood first, then sorts by date
ReadingSchema.index({ Mahalle: 1, Tarih: -1 });

// Index on Mahalle for aggregation queries
ReadingSchema.index({ Mahalle: 1 });

module.exports = mongoose.model('Reading', ReadingSchema);