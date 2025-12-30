const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Ayarlar
dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Test Endpoint (Scrum Master'a 'sistem hazır' mesajı)
app.get('/', (req, res) => {
    res.json({ message: "Mahalle Yonetim Sistemi v2 API aktif." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda calisiyor.`);
});