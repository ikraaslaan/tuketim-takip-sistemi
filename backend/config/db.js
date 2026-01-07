const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB bağlantı adresi (Localhost veya Atlas URL'si buraya gelecek)
    // process.env.MONGO_URI, .env dosyasından okunacak
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Bağlandı: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Hata: ${error.message}`);
    process.exit(1); // Hata varsa uygulamayı durdur
  }
};

module.exports = connectDB;