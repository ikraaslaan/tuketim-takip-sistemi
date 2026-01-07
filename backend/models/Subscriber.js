const mongoose = require('mongoose');

// Şema Tanımı
const subscriberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  neighborhood: { // Veritabanındaki 'neighborhood' alanı
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Model varsa onu kullan, yoksa yeni oluştur (Hata almamak için)
module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);