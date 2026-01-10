const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // MongoDB'ye bağlan
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı kuruldu');

    // Admin kullanıcısı var mı kontrol et
    const existingAdmin = await User.findOne({ email: 'admin' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin kullanıcısı zaten mevcut');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      console.log('Verified:', existingAdmin.isVerified);
      
      // Eğer verified değilse, verify et
      if (!existingAdmin.isVerified) {
        existingAdmin.isVerified = true;
        existingAdmin.verificationToken = null;
        await existingAdmin.save();
        console.log('✅ Admin kullanıcısı doğrulandı');
      }
    } else {
      // Yeni admin kullanıcısı oluştur
      const adminUser = new User({
        name: 'Admin',
        surname: 'User',
        neighborhood: 'Sistem',
        email: 'admin',
        password: '123456',
        role: 'admin',
        isVerified: true,
        verificationToken: null
      });

      await adminUser.save();
      console.log('✅ Admin kullanıcısı oluşturuldu');
      console.log('Email: admin');
      console.log('Şifre: 123456');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
};

seedAdmin();
