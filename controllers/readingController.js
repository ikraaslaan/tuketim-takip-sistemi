const Reading = require('../models/Reading');

// Son 7 günlük verilerin ortalamasını al
exports.getWeeklyAverages = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const averages = await Reading.aggregate([
            {
                $match: {
                    Tarih: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { Mahalle: "$Mahalle", Kaynak: "$Kaynak_Tipi" },
                    ortalamaTuketim: { $avg: "$Tuketim_Miktari" }
                }
            },
            {
                $project: {
                    _id: 0,
                    Mahalle: "$_id.Mahalle",
                    Kaynak: "$_id.Kaynak",
                    ortalamaTuketim: { $round: ["$ortalamaTuketim", 2] }
                }
            }
        ]);

        res.status(200).json(averages);
    } catch (error) {
        res.status(500).json({ message: "Veri hesaplama hatası", error: error.message });
    }
};

// Seçilen mahallenin her kaynak için en son verisini getirir
exports.getLatestReadingsByNeighborhood = async (req, res) => {
    try {
        const { mahalleAdi } = req.params;
        const kaynaklar = ['Elektrik', 'Su', 'Dogalgaz'];
        
        // Her kaynak tipi için en son kaydı bulan asenkron döngü
        const latestReadings = await Promise.all(kaynaklar.map(async (kaynak) => {
            return await Reading.findOne({ 
                Mahalle: mahalleAdi, 
                Kaynak_Tipi: kaynak 
            })
            .sort({ Tarih: -1 }) // En son tarihi getir
            .limit(1);
        }));

        res.status(200).json(latestReadings.filter(r => r !== null));
    } catch (error) {
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

        const averages = await Reading.aggregate([
            { $match: { Tarih: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { Mahalle: "$Mahalle", Kaynak: "$Kaynak_Tipi" },
                    ortalamaTuketim: { $avg: "$Tuketim_Miktari" }
                }
            },
            {
                $project: {
                    _id: 0,
                    Mahalle: "$_id.Mahalle",
                    Kaynak: "$_id.Kaynak",
                    ortalamaTuketim: { $round: ["$ortalamaTuketim", 2] }
                }
            }
        ]);
        res.json(averages);
    } catch (error) {
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

// Yardımcı Fonksiyon: MongoDB Aggregation
async function calculateMonthlyStats(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const Reading = require('../models/Reading');
    return await Reading.aggregate([
        { $match: { Tarih: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: { Mahalle: "$Mahalle", Kaynak: "$Kaynak_Tipi" },
                Ort: { $avg: "$Tuketim_Miktari" },
                Zirve: { $max: "$Tuketim_Miktari" },
                Dusuk: { $min: "$Tuketim_Miktari" }
            }
        },
        {
            $group: {
                _id: "$_id.Mahalle",
                veriler: {
                    $push: {
                        k: "$_id.Kaynak",
                        v: { Ort: "$Ort", Zirve: "$Zirve", Dusuk: "$Dusuk" }
                    }
                }
            }
        },
        {
            $project: {
                Mahalle: "$_id",
                data: { $arrayToObject: "$veriler" }
            }
        },
        {
            $project: {
                _id: 0,
                Mahalle: 1,
                Elektrik: "$data.Elektrik",
                Su: "$data.Su",
                Dogalgaz: "$data.Dogalgaz"
            }
        }
    ]);
}

// Formatlama ve Değişim Hesaplama Araçları
const formatStats = (s) => s ? `${s.Ort.toFixed(2)} / ${s.Zirve.toFixed(2)} / ${s.Dusuk.toFixed(2)}` : "0 / 0 / 0";
const calculateChange = (curr, prev) => {
    if (!curr || !prev) return "0.00%";
    const change = ((curr - prev) / prev) * 100;
    return (change > 0 ? "+" : "") + change.toFixed(2) + "%";
};

// Zaman Serisi Analizi: Aylık tüketim trendleri
exports.getTimeSeriesAnalysis = async (req, res) => {
    try {
        const { mahalle, yil } = req.query;
        const readings = await Reading.aggregate([
            { 
                $match: { 
                    Mahalle: mahalle, 
                    Tarih: { 
                        $gte: new Date(`${yil}-01-01`), 
                        $lte: new Date(`${yil}-12-31`) 
                    } 
                } 
            },
            {
                $group: {
                    _id: { ay: { $month: "$Tarih" }, kaynak: "$Kaynak_Tipi" },
                    toplam: { $sum: "$Tuketim_Miktari" }
                }
            },
            {
                $group: {
                    _id: "$_id.ay",
                    veriler: { $push: { k: "$_id.kaynak", v: "$toplam" } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        res.status(200).json(readings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};