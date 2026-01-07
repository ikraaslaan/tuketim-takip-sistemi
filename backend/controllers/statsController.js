const Reading = require('../models/Reading');

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Veritabanından verileri çek ve Mahalle bazında grupla
        const stats = await Reading.aggregate([
            {
                $group: {
                    _id: "$Mahalle", // Gruplama anahtarı: Mahalle Adı
                    
                    // Veritabanındaki alan isimlerin 'Elektrik_Tuketim' ise burası çalışır
                    avgElektrik: { $avg: "$Elektrik_Tuketim" }, 
                    avgSu: { $avg: "$Su_Tuketim" },             
                    avgDogalgaz: { $avg: "$Dogalgaz_Tuketim" }  
                }
            },
            {
                // 2. Çıkan sonucu Frontend'in istediği formata dönüştür
                $project: {
                    _id: 0,
                    mahalle: "$_id",
                    elektrik: { 
                        ortalama: { $round: ["$avgElektrik", 2] } // Virgülden sonra 2 basamak
                    },
                    su: { 
                        ortalama: { $round: ["$avgSu", 2] } 
                    },
                    dogalgaz: { 
                        ortalama: { $round: ["$avgDogalgaz", 2] } 
                    }
                }
            },
            { $sort: { mahalle: 1 } } // Alfabetik sırala
        ]).allowDiskUse(true); // Prevent 32MB sort limit error

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error("Veri Çekme Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Time Series Data for Last 7 Days
exports.getTimeSeries = async (req, res) => {
    try {
        const { mahalle, kaynak } = req.query;

        if (!mahalle || !kaynak) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mahalle ve kaynak parametreleri gerekli' 
            });
        }

        // Son 7 günün tarih aralığını hesapla
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Kaynak alanını belirle
        let kaynakField;
        switch (kaynak.toLowerCase()) {
            case 'elektrik':
                kaynakField = 'Elektrik_Tuketim';
                break;
            case 'su':
                kaynakField = 'Su_Tuketim';
                break;
            case 'dogalgaz':
                kaynakField = 'Dogalgaz_Tuketim';
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Geçersiz kaynak tipi. Elektrik, Su veya Dogalgaz olmalı' 
                });
        }

        // Son 7 günün verilerini çek
        const readings = await Reading.find({
            Mahalle: mahalle,
            Tarih: {
                $gte: startDate,
                $lte: endDate
            }
        })
        .sort({ Tarih: 1 })
        .select(`Tarih ${kaynakField}`)
        .lean();

        // Time series verisini formatla
        const timeSeries = readings.map(reading => ({
            tarih: reading.Tarih ? new Date(reading.Tarih).toLocaleDateString('tr-TR', { 
                day: '2-digit', 
                month: '2-digit' 
            }) : '',
            value: reading[kaynakField] || 0
        }));

        // İstatistikleri hesapla
        const values = readings.map(r => r[kaynakField] || 0).filter(v => v > 0);
        
        if (values.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Son 7 gün için veri bulunamadı' 
            });
        }

        const ortalama = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        // Önceki 7 günün verilerini çek (karşılaştırma için)
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        const prevEndDate = new Date(startDate);

        const prevReadings = await Reading.find({
            Mahalle: mahalle,
            Tarih: {
                $gte: prevStartDate,
                $lt: prevEndDate
            }
        })
        .select(kaynakField)
        .lean();

        const prevValues = prevReadings.map(r => r[kaynakField] || 0).filter(v => v > 0);
        const prevOrtalama = prevValues.length > 0 
            ? prevValues.reduce((sum, val) => sum + val, 0) / prevValues.length 
            : ortalama;

        const degisim = prevOrtalama > 0 
            ? ((ortalama - prevOrtalama) / prevOrtalama * 100).toFixed(2)
            : 0;
        const artis = degisim > 0;

        const statistics = {
            ortalama: Math.round(ortalama * 100) / 100,
            degisim: `${artis ? '+' : ''}${degisim}%`,
            artis: artis
        };

        res.status(200).json({
            success: true,
            data: {
                timeSeries,
                statistics
            }
        });

    } catch (error) {
        console.error("Time Series Veri Çekme Hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};