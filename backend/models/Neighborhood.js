const mongoose = require('mongoose');

const NeighborhoodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // İsim girmek zorunlu
    unique: true    // Aynı isimde iki mahalle olamaz
  },
  population: {
    type: Number,
    default: 0
  },
  city: {
    type: String,
    default: 'Istanbul' // Örnek şehir
  }
}, { timestamps: true }); // Kayıt oluşturulma tarihini otomatik tutar

module.exports = mongoose.model('Neighborhood', NeighborhoodSchema);