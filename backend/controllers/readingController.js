const Reading = require('../models/Reading');
const { calculatePearson } = require('../utils/mathUtils');

// Son 7 günlük verilerin ortalamasını al
// Yeni veri yapısını destekler: Elektrik_Tuketim, Su_Tuketim, Dogalgaz_Tuketim
exports.getWeeklyAverages = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Yeni yapı için aggregation (Elektrik_Tuketim, Su_Tuketim, Dogalgaz_Tuketim)
        const averages = await Reading.aggregate([
            {
                $match: {
                    Tarih: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: "$Mahalle",
                    elektrikOrtalama: { $avg: "$Elektrik_Tuketim" },
                    suOrtalama: { $avg: "$Su_Tuketim" },
                    dogalgazOrtalama: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            {
                $project: {
                    _id: 0,
                    Mahalle: "$_id",
                    Elektrik: { $round: ["$elektrikOrtalama", 2] },
                    Su: { $round: ["$suOrtalama", 2] },
                    Dogalgaz: { $round: ["$dogalgazOrtalama", 2] }
                }
            },
            { $sort: { Mahalle: 1 } }
        ]);

        res.status(200).json(averages);
    } catch (error) {
        console.error("Haftalık ortalama hesaplama hatası:", error);
        res.status(500).json({ message: "Veri hesaplama hatası", error: error.message });
    }
};

// Seçilen mahallenin en son verisini getirir (yeni yapı: tüm kaynaklar tek kayıtta)
exports.getLatestReadingsByNeighborhood = async (req, res) => {
    try {
        const { mahalleAdi } = req.params;
        
        // Yeni yapı: Tek bir kayıt tüm kaynakları içerir
        const latestReading = await Reading.findOne({ 
            Mahalle: mahalleAdi
            })
            .sort({ Tarih: -1 }) // En son tarihi getir
        .limit(1)
        .select('Mahalle Tarih Elektrik_Tuketim Su_Tuketim Dogalgaz_Tuketim');

        if (!latestReading) {
            return res.status(404).json({ 
                message: `${mahalleAdi} mahallesi için veri bulunamadı` 
            });
        }

        // Yeni yapıya uygun format
        res.status(200).json({
            Mahalle: latestReading.Mahalle,
            Tarih: latestReading.Tarih,
            Elektrik: {
                Tuketim: latestReading.Elektrik_Tuketim || 0,
                Birim: 'kWh'
            },
            Su: {
                Tuketim: latestReading.Su_Tuketim || 0,
                Birim: 'm³'
            },
            Dogalgaz: {
                Tuketim: latestReading.Dogalgaz_Tuketim || 0,
                Birim: 'm³'
            }
        });
    } catch (error) {
        console.error("Son veriler çekme hatası:", error);
        res.status(500).json({ message: "Son veriler çekilemedi", error: error.message });
    }
};

//  Mahalle arama endpointi
exports.searchNeighborhoods = async (req, res) => {
    try {
        const { query } = req.query;
        // Benzersiz mahalle isimlerini getir ve arama kriterine göre filtrele
        const results = await Reading.distinct('Mahalle', {
            Mahalle: { $regex: query, $options: 'i' }
        });
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: "Arama hatası", error: error.message });
    }
};

exports.getMonthlyAverages = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Yeni yapı için aggregation
        const averages = await Reading.aggregate([
            { $match: { Tarih: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: "$Mahalle",
                    elektrikOrtalama: { $avg: "$Elektrik_Tuketim" },
                    suOrtalama: { $avg: "$Su_Tuketim" },
                    dogalgazOrtalama: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            {
                $project: {
                    _id: 0,
                    Mahalle: "$_id",
                    Elektrik: { $round: ["$elektrikOrtalama", 2] },
                    Su: { $round: ["$suOrtalama", 2] },
                    Dogalgaz: { $round: ["$dogalgazOrtalama", 2] }
                }
            },
            { $sort: { Mahalle: 1 } }
        ]);
        res.json(averages);
    } catch (error) {
        console.error("Aylık ortalama hesaplama hatası:", error);
        res.status(500).json({ error: error.message });
    }
};

// İstatistik Özeti Tablosu İçin Gelişmiş API
exports.getStatsSummary = async (req, res) => {
    try {
        const { ay, yil } = req.query; // Örn: 12 ve 2025
        const targetDate = new Date(yil, ay - 1, 1);
        const prevMonthDate = new Date(yil, ay - 2, 1);

        // 1. Mevcut Ay ve Geçen Ay verilerini paralel olarak çek
        const [currentStats, prevStats] = await Promise.all([
            calculateMonthlyStats(targetDate),
            calculateMonthlyStats(prevMonthDate)
        ]);

        // 2. Verileri Mahalle bazında birleştir ve Değişim (Change) hesapla
        const summaryTable = currentStats.map(curr => {
            const prev = prevStats.find(p => p.Mahalle === curr.Mahalle) || {};
            
            return {
                Mahalle: curr.Mahalle,
                Elektrik: formatStats(curr.Elektrik),
                Su: formatStats(curr.Su),
                Dogalgaz: formatStats(curr.Dogalgaz),
                Degisim: {
                    E: calculateChange(curr.Elektrik?.Ort, prev.Elektrik?.Ort),
                    S: calculateChange(curr.Su?.Ort, prev.Su?.Ort),
                    D: calculateChange(curr.Dogalgaz?.Ort, prev.Dogalgaz?.Ort)
                }
            };
        });

        res.status(200).json(summaryTable);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Yardımcı Fonksiyon: MongoDB Aggregation (Yeni yapı için)
async function calculateMonthlyStats(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const Reading = require('../models/Reading');
    return await Reading.aggregate([
        { $match: { Tarih: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: "$Mahalle",
                Elektrik: {
                    Ort: { $avg: "$Elektrik_Tuketim" },
                    Zirve: { $max: "$Elektrik_Tuketim" },
                    Dusuk: { $min: "$Elektrik_Tuketim" }
        },
                Su: {
                    Ort: { $avg: "$Su_Tuketim" },
                    Zirve: { $max: "$Su_Tuketim" },
                    Dusuk: { $min: "$Su_Tuketim" }
                },
                Dogalgaz: {
                    Ort: { $avg: "$Dogalgaz_Tuketim" },
                    Zirve: { $max: "$Dogalgaz_Tuketim" },
                    Dusuk: { $min: "$Dogalgaz_Tuketim" }
                }
            }
        },
        {
            $project: {
                _id: 0,
                Mahalle: "$_id",
                Elektrik: {
                    Ort: { $round: ["$Elektrik.Ort", 2] },
                    Zirve: { $round: ["$Elektrik.Zirve", 2] },
                    Dusuk: { $round: ["$Elektrik.Dusuk", 2] }
                },
                Su: {
                    Ort: { $round: ["$Su.Ort", 2] },
                    Zirve: { $round: ["$Su.Zirve", 2] },
                    Dusuk: { $round: ["$Su.Dusuk", 2] }
                },
                Dogalgaz: {
                    Ort: { $round: ["$Dogalgaz.Ort", 2] },
                    Zirve: { $round: ["$Dogalgaz.Zirve", 2] },
                    Dusuk: { $round: ["$Dogalgaz.Dusuk", 2] }
            }
        }
        },
        { $sort: { Mahalle: 1 } }
    ]);
}

// Formatlama ve Değişim Hesaplama Araçları
const formatStats = (s) => s ? `${s.Ort.toFixed(2)} / ${s.Zirve.toFixed(2)} / ${s.Dusuk.toFixed(2)}` : "0 / 0 / 0";
const calculateChange = (curr, prev) => {
    if (!curr || !prev) return "0.00%";
    const change = ((curr - prev) / prev) * 100;
    return (change > 0 ? "+" : "") + change.toFixed(2) + "%";
};

// Zaman Serisi Analizi: Aylık tüketim trendleri (Yeni yapı için)
exports.getTimeSeriesAnalysis = async (req, res) => {
    try {
        const { mahalle, yil } = req.query;
        const selectedYear = yil ? parseInt(yil) : new Date().getFullYear();
        
        if (!mahalle) {
            return res.status(400).json({ error: 'Mahalle parametresi gereklidir' });
        }
        
        const readings = await Reading.aggregate([
            { 
                $match: { 
                    Mahalle: mahalle, 
                    Tarih: { 
                        $gte: new Date(`${selectedYear}-01-01`), 
                        $lte: new Date(`${selectedYear}-12-31 23:59:59`) 
                    } 
                } 
            },
            {
                $group: {
                    _id: { $month: "$Tarih" },
                    elektrik: { $avg: "$Elektrik_Tuketim" },
                    su: { $avg: "$Su_Tuketim" },
                    dogalgaz: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            {
                $project: {
                    _id: 0,
                    ay: "$_id",
                    Elektrik: { $round: ["$elektrik", 2] },
                    Su: { $round: ["$su", 2] },
                    Dogalgaz: { $round: ["$dogalgaz", 2] }
                }
            },
            { $sort: { ay: 1 } }
        ]);
        res.status(200).json(readings);
    } catch (error) {
        console.error("Zaman serisi analizi hatası:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getCorrelation = async (req, res) => {
    try {
        const { mahalle, ay, yil, mevsim } = req.query;
        
        if (!mahalle) {
            return res.status(400).json({ error: 'Mahalle parametresi gereklidir' });
        }
        
        let matchStage = {
            Mahalle: mahalle
        };

        // Mevsimsel veya Aylık Filtreleme
        if (mevsim) {
            const seasons = {
                'Kış': [12, 1, 2], 
                'İlkbahar': [3, 4, 5],
                'Yaz': [6, 7, 8], 
                'Sonbahar': [9, 10, 11]
            };
            const seasonMonths = seasons[mevsim];
            if (!seasonMonths) {
                return res.status(400).json({ error: 'Geçersiz mevsim' });
            }
            matchStage["$expr"] = { $in: [{ $month: "$Tarih" }, seasonMonths] };
        } else if (ay && yil) {
            matchStage["$expr"] = { 
                $and: [
                    { $eq: [{ $month: "$Tarih" }, parseInt(ay)] },
                    { $eq: [{ $year: "$Tarih" }, parseInt(yil)] }
                ]
            };
        } else {
            return res.status(400).json({ error: 'Ay ve yıl veya mevsim parametreleri gereklidir' });
        }

        // Verileri çek (yeni yapı)
        const data = await Reading.find(matchStage)
            .select('Elektrik_Tuketim Su_Tuketim Dogalgaz_Tuketim Tarih')
            .lean();
        
        if (!data || data.length === 0) {
            return res.status(404).json({ 
                message: 'Belirtilen kriterlere uygun veri bulunamadı' 
            });
        }
        
        // Korelasyon hesaplama
        const elektrikValues = data.map(d => d.Elektrik_Tuketim || 0);
        const suValues = data.map(d => d.Su_Tuketim || 0);
        const dogalgazValues = data.map(d => d.Dogalgaz_Tuketim || 0);
        
        // Pearson korelasyon katsayısı hesapla
        const elekSuCorr = calculatePearson(elektrikValues, suValues);
        const elekGazCorr = calculatePearson(elektrikValues, dogalgazValues);
        const suGazCorr = calculatePearson(suValues, dogalgazValues);
        
        res.json({ 
            success: true,
            period: mevsim || `${ay}/${yil}`,
            mahalle: mahalle,
            correlations: {
                'Elektrik-Su': {
                    coefficient: elekSuCorr,
                    interpretation: elekSuCorr > 0.7 ? 'Güçlü pozitif' : 
                                   elekSuCorr > 0.3 ? 'Orta pozitif' : 
                                   elekSuCorr > -0.3 ? 'Zayıf' : 
                                   elekSuCorr > -0.7 ? 'Orta negatif' : 'Güçlü negatif'
                },
                'Elektrik-Doğalgaz': {
                    coefficient: elekGazCorr,
                    interpretation: elekGazCorr > 0.7 ? 'Güçlü pozitif' : 
                                   elekGazCorr > 0.3 ? 'Orta pozitif' : 
                                   elekGazCorr > -0.3 ? 'Zayıf' : 
                                   elekGazCorr > -0.7 ? 'Orta negatif' : 'Güçlü negatif'
                },
                'Su-Doğalgaz': {
                    coefficient: suGazCorr,
                    interpretation: suGazCorr > 0.7 ? 'Güçlü pozitif' : 
                                   suGazCorr > 0.3 ? 'Orta pozitif' : 
                                   suGazCorr > -0.3 ? 'Zayıf' : 
                                   suGazCorr > -0.7 ? 'Orta negatif' : 'Güçlü negatif'
                }
            },
            sampleSize: data.length
        });
    } catch (error) {
        console.error("Korelasyon analizi hatası:", error);
        res.status(500).json({ error: error.message });
    }
};