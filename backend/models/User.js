const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // Turkish field name (for user dashboard)
  mahalle: {
    type: String,
    required: false
  },
  // English field name (for compatibility)
  neighborhood: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['admin', 'kullanici'],
    default: 'kullanici'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
