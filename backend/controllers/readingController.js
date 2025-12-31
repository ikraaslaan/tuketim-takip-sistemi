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