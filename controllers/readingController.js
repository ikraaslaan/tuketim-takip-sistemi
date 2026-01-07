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