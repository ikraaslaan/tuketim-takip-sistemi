const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    surname: { type: String, required: true },
    neighborhood: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: String
});

// Şifreyi kaydetmeden hemen önce hashle (Modern Async Sürümü)
UserSchema.pre('save', async function() {
    // Eğer şifre değişmemişse (örn: sadece isim güncelleniyorsa) işlemi geç
    if (!this.isModified('password')) return;

    // Şifreyi hashle
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // next() çağırmaya gerek yok, async fonksiyon bitince Mongoose devam eder
});

module.exports = mongoose.model('User', UserSchema);