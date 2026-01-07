const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Baglandi: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Hata: ${error.message}`);
        process.exit(1); // Hata durumunda uygulamayı durdur
    }
};

module.exports = connectDB;
