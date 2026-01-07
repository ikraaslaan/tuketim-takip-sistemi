const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Bağlandı...'))
  .catch(err => console.error(err));

const createAdmin = async () => {
  try {
    // Varsa eski admini sil (Çakışma olmasın)
    await User.deleteMany({ username: 'admin' });

    // Şifreyi Hash'le (Şifreleme)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt); // Şifre: 123456

    // Admini oluştur
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin kullanıcısı oluşturuldu!');
    console.log('Kullanıcı Adı: admin');
    console.log('Şifre: 123456');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();