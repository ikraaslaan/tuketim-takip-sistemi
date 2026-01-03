const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB, getDB } = require('./config/db');
const readingRoutes = require('./routes/readingRoutes');

// Ayarlar
dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Veritabanına Bağlan
(async () => {
    try {
        await connectDB();
        console.log('✅ Database bağlantısı hazır');
    } catch (err) {
        console.error('❌ Database bağlantı hatası:', err);
        process.exit(1);
    }
})();

// Routes
app.use('/api/readings', readingRoutes);

// Dashboard endpoint - Flask'tan taşındı
app.get('/api/stats/dashboard', async (req, res) => {
    try {
        let db;
        try {
            db = getDB();
        } catch (err) {
            // Database henüz bağlanmadıysa, bağlanmayı bekle
            await connectDB();
            db = getDB();
        }
        const tuketim_col = db.collection('tuketim_kayitlari');
        const mahalle_tanim_col = db.collection('mahalle_tanimlari');

        // Mahalle tanımlarını al
        const mahalleler = await mahalle_tanim_col.find({}).toArray();
        const result = [];

        // Son 30 günlük verileri al
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Her mahalle için ortalamaları hesapla
        for (const mahalle of mahalleler) {
            const mahalle_adi = mahalle.mahalle_adi || '';

            // Varsayılan değerler
            let elektrik_ortalama = mahalle.base_elektrik || 0;
            let su_ortalama = mahalle.base_su || 0;
            let dogalgaz_ortalama = mahalle.base_dogalgaz || 0;

            try {
                // Elektrik ortalaması
                const elektrik_pipeline = [
                    {
                        $match: {
                            Mahalle: mahalle_adi,
                            Tarih: { $gte: thirtyDaysAgo },
                            Elektrik_Tuketim: { $exists: true, $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            ortalama: { $avg: '$Elektrik_Tuketim' }
                        }
                    }
                ];
                const elektrik_result = await tuketim_col.aggregate(elektrik_pipeline).toArray();
                if (elektrik_result.length > 0 && elektrik_result[0].ortalama) {
                    elektrik_ortalama = Math.round(elektrik_result[0].ortalama * 100) / 100;
                }

                // Su ortalaması
                const su_pipeline = [
                    {
                        $match: {
                            Mahalle: mahalle_adi,
                            Tarih: { $gte: thirtyDaysAgo },
                            Su_Tuketim: { $exists: true, $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            ortalama: { $avg: '$Su_Tuketim' }
                        }
                    }
                ];
                const su_result = await tuketim_col.aggregate(su_pipeline).toArray();
                if (su_result.length > 0 && su_result[0].ortalama) {
                    su_ortalama = Math.round(su_result[0].ortalama * 100) / 100;
                }

                // Doğalgaz ortalaması
                const dogalgaz_pipeline = [
                    {
                        $match: {
                            Mahalle: mahalle_adi,
                            Tarih: { $gte: thirtyDaysAgo },
                            Dogalgaz_Tuketim: { $exists: true, $ne: null }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            ortalama: { $avg: '$Dogalgaz_Tuketim' }
                        }
                    }
                ];
                const dogalgaz_result = await tuketim_col.aggregate(dogalgaz_pipeline).toArray();
                if (dogalgaz_result.length > 0 && dogalgaz_result[0].ortalama) {
                    dogalgaz_ortalama = Math.round(dogalgaz_result[0].ortalama * 100) / 100;
                }
            } catch (error) {
                console.error(`Hata (${mahalle_adi}):`, error.message);
            }

            result.push({
                mahalle: mahalle_adi,
                elektrik: { ortalama: elektrik_ortalama },
                su: { ortalama: su_ortalama },
                dogalgaz: { ortalama: dogalgaz_ortalama }
            });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Dashboard endpoint hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Timeseries endpoint - Flask'tan taşındı
app.get('/api/stats/timeseries', async (req, res) => {
    try {
        let db;
        try {
            db = getDB();
        } catch (err) {
            // Database henüz bağlanmadıysa, bağlanmayı bekle
            await connectDB();
            db = getDB();
        }
        
        const mahalle = decodeURIComponent(req.query.mahalle || '');
        const kaynak = (req.query.kaynak || '').toLowerCase();

        console.log('Timeseries request:', { mahalle, kaynak });

        if (!mahalle || !kaynak) {
            return res.status(400).json({ success: false, error: 'mahalle ve kaynak parametreleri gerekli' });
        }

        const kaynak_map = {
            'elektrik': 'Elektrik_Tuketim',
            'su': 'Su_Tuketim',
            'dogalgaz': 'Dogalgaz_Tuketim'
        };

        if (!kaynak_map[kaynak]) {
            return res.status(400).json({ success: false, error: 'Geçersiz kaynak tipi. elektrik, su veya dogalgaz olmalı' });
        }

        const field_name = kaynak_map[kaynak];
        const tuketim_col = db.collection('tuketim_kayitlari');

        // Son 7 günlük verileri al
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const query = {
            Mahalle: mahalle,
            Tarih: { $gte: sevenDaysAgo },
            [field_name]: { $exists: true, $ne: null }
        };

        // Günlük ortalamaları hesapla - Son 7 gün için her günün ortalaması
        // Önce verileri çek, sonra JavaScript'te grupla (MongoDB'de dinamik field name zor)
        console.log('Query:', JSON.stringify(query, null, 2));
        const documents = await tuketim_col.find(query).sort({ Tarih: 1 }).toArray();
        console.log('Documents bulundu:', documents.length);
        
        // Günlere göre grupla ve ortalamaları hesapla
        const dailyData = {};
        for (const doc of documents) {
            const value = doc[field_name];
            if (value !== null && value !== undefined) {
                const tarih_obj = doc.Tarih;
                let tarih_str;
                if (tarih_obj instanceof Date) {
                    tarih_str = tarih_obj.toISOString().split('T')[0];
                } else {
                    tarih_str = String(tarih_obj).substring(0, 10);
                }
                
                if (!dailyData[tarih_str]) {
                    dailyData[tarih_str] = { values: [], tarih: tarih_str };
                }
                dailyData[tarih_str].values.push(parseFloat(value));
            }
        }
        
        // Her gün için ortalamayı hesapla
        const time_series = Object.keys(dailyData)
            .sort()
            .map(tarih => {
                const data = dailyData[tarih];
                const ortalama = data.values.reduce((a, b) => a + b, 0) / data.values.length;
                return {
                    tarih: tarih,
                    value: Math.round(ortalama * 100) / 100
                };
            });
        
        console.log('Time series sonuç:', time_series.length, 'gün');

        // Önceki 7 gün için verileri çek (karşılaştırma)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const prev_query = {
            Mahalle: mahalle,
            Tarih: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
            [field_name]: { $exists: true, $ne: null }
        };

        const prev_documents = await tuketim_col.find(prev_query).toArray();
        const prev_values = prev_documents
            .map(doc => doc[field_name])
            .filter(val => val !== null && val !== undefined);

        // İstatistikleri hesapla
        let statistics = null;
        if (time_series.length > 0) {
            const values = time_series.map(item => item.value).filter(val => val !== null && val !== undefined);
            if (values.length > 0) {
                const ortalama = values.reduce((a, b) => a + b, 0) / values.length;
                const prev_ortalama = prev_values.length > 0
                    ? prev_values.reduce((a, b) => a + b, 0) / prev_values.length
                    : ortalama;

                let degisim_str = '0%';
                let artis = false;

                if (prev_ortalama > 0) {
                    const degisim_yuzde = ((ortalama - prev_ortalama) / prev_ortalama) * 100;
                    artis = degisim_yuzde > 0;
                    degisim_str = `${artis ? '+' : ''}${degisim_yuzde.toFixed(1)}%`;
                }

                statistics = {
                    ortalama: Math.round(ortalama * 100) / 100,
                    degisim: degisim_str,
                    artis: artis
                };
            }
        }

        console.log('Time series sonuç:', time_series.length, 'gün, Statistics:', statistics ? 'var' : 'yok');
        
        res.json({
            success: true,
            data: {
                timeSeries: time_series,
                statistics: statistics
            }
        });
    } catch (error) {
        console.error('Timeseries endpoint hatası:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// Test Endpoint
app.get('/', (req, res) => {
    res.json({ message: "Mahalle Yonetim Sistemi v2 API aktif." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Sunucu ${PORT} portunda calisiyor.`);
});