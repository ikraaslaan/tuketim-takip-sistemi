const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
    enum: ['Elektrik', 'Su', 'Dogalgaz'] // Sadece bu değerleri alabilir, hata yapmanı engeller
  },
  unit: {
    type: String,
    required: true // Örn: kWh, m3
  }
}, { timestamps: true });

module.exports = mongoose.model('Resource', ResourceSchema);