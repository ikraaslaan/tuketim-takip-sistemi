const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Rota Dosyaları
const readingRoutes = require('./routes/readingRoutes');
const statsRoutes = require('./routes/statsRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const subscriberVerificationRoutes = require('./routes/subscriberVerificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const supportRoutes = require('./routes/supportRoutes');

dotenv.config();

const app = express();

// --- 1. MIDDLEWARE ---
// Frontend (3000) erişimi için CORS izni
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // PDF upload için daha büyük limit

// Increase timeout for long-running requests (especially PDF generation)
app.use((req, res, next) => {
    // Set timeout to 5 minutes for analytics endpoints
    if (req.path.includes('/analytics/generate-report')) {
        req.setTimeout(300000); // 5 minutes
    }
    next();
});

// --- 2. ROTALAR ---
app.use('/api/readings', readingRoutes);
app.use('/api/stats', statsRoutes);          
app.use('/api/incidents', incidentRoutes);   
app.use('/api/predictions', predictionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/verification/subscriber', subscriberVerificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/support', supportRoutes);

// Test Rotası
app.get('/', (req, res) => res.send('API Calisiyor...'));

// 404 Handler (Rota bulunamazsa)
app.use((req, res, next) => {
    if (!res.headersSent) {
        res.status(404).json({ success: false, message: `Rota bulunamadı: ${req.method} ${req.path}` });
    }
});

// --- 3. VERİTABANI BAĞLANTISI ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Başarıyla Bağlandı');
        
        // Ensure indexes are created for Reading model (tuketim_kayitlari collection)
        // This prevents memory issues during sorting operations and enables fast queries
        const Reading = require('./models/Reading');
        
        // Create all indexes defined in the schema (background: true for non-blocking)
        try {
            await Reading.createIndexes({ background: true });
            console.log('✅ Reading model indexes ensured (Tarih: -1, Mahalle: 1, Mahalle+Tarih compound)');
        } catch (idxErr) {
            if (idxErr.code !== 85) { // 85 = IndexOptionsConflict, index already exists
                console.log('ℹ️ Indexes may already exist or creation failed:', idxErr.message);
            } else {
                console.log('✅ Indexes already exist');
            }
        }
        
        // Explicitly ensure compound index for performance (CRITICAL for report generation)
        try {
            await Reading.collection.createIndex({ Mahalle: 1, Tarih: -1 }, { background: true });
            console.log('✅ Mahalle + Tarih compound index oluşturuldu');
        } catch (idxErr) {
            if (idxErr.code !== 85) {
                console.log('ℹ️ Mahalle + Tarih index zaten mevcut veya oluşturulamadı:', idxErr.message);
            }
        }
        
        try {
            await Reading.collection.createIndex({ Mahalle: 1 }, { background: true });
            console.log('✅ Mahalle index oluşturuldu');
        } catch (idxErr) {
            if (idxErr.code !== 85) {
                console.log('ℹ️ Mahalle index zaten mevcut veya oluşturulamadı:', idxErr.message);
            }
        }
        
    } catch (err) {
        console.error('❌ MongoDB Hatası:', err.message);
    }
};

// --- 4. SUNUCUYU BAŞLAT VE GRACEFUL SHUTDOWN AYARI ---
const PORT = process.env.PORT || 5001;

// Sunucuyu bir değişkene atıyoruz ki sonra kapatabilelim
const server = app.listen(PORT, async () => {
    await connectDB();
    console.log(`🚀 Sunucu ${PORT} portunda sorunsuz çalışıyor.`);
});

// CTRL + C (SIGINT) sinyalini yakala
process.on('SIGINT', () => {
    console.log('\n🛑 Sunucu kapatılıyor... (Kapatma sinyali alındı)');

    // Önce sunucuyu yeni isteklere kapat
    server.close(() => {
        console.log('✅ HTTP sunucusu kapandı.');

        // Sonra MongoDB bağlantısını güvenli şekilde kes
        mongoose.connection.close(false, () => {
            console.log('✅ MongoDB bağlantısı kesildi.');
            // En son işlemi tamamen bitir
            process.exit(0); 
        });
    });
});