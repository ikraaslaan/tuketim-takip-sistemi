const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const readingRoutes = require('./routes/readingRoutes');
const authRoutes = require('./routes/authRoutes');
const simulationRoutes = require('./routes/incidentRoutes');  
const reportRoutes = require('./routes/reportRoutes');
const statsRoutes = require('./routes/statsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriberRoutes = require('./routes/subscriberRoutes');
const verificationRoutes = require('./routes/verificationRoutes');


// Ayarlar
dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Veritabanına Bağlan
connectDB();

app.use('/api/readings', readingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/incidents', simulationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/verification', verificationRoutes);


// Test Endpoint (Scrum Master'a 'sistem hazır' mesajı)
app.get('/', (req, res) => {
    res.json({ message: "Mahalle Yonetim Sistemi v2 API aktif." });
});

// MongoDB Bağlantı Durumu Kontrolü
app.get('/api/health', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const dbState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        res.json({
            status: 'ok',
            mongodb: {
                state: states[dbState] || 'unknown',
                connected: dbState === 1,
                host: mongoose.connection.host || 'N/A',
                database: mongoose.connection.name || 'N/A'
            },
            smtp: {
                user: process.env.SMTP_USER || 'not configured',
                pass: process.env.SMTP_PASS ? 'configured' : 'not configured'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Test Email Gönderimi Endpoint'i
app.post('/api/test/email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email adresi gerekli' });
        }

        const { sendVerificationEmail } = require('./services/mailService');
        const testCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const result = await sendVerificationEmail(email, testCode);
        
        res.json({
            success: true,
            message: result.isTestMode 
                ? 'Test email gönderildi (test modu - gerçek email gönderilmedi)' 
                : 'Test email başarıyla gönderildi',
            testCode: testCode,
            previewUrl: result.previewUrl,
            isTestMode: result.isTestMode
        });
    } catch (error) {
        console.error('Test email hatası:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda calisiyor.`);
});