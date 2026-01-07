const Reading = require('../models/Reading');

exports.getPrediction = async (req, res) => {
  try {
    const { mahalle } = req.query;

    if (!mahalle) {
      return res.status(400).json({ message: "Lütfen bir mahalle adı girin." });
    }

    // 1. O mahallenin tüm verilerini çek
    // (Gerçek hayatta sadece son 1-2 aya bakılır ama senin verin 2022'de, o yüzden hepsine bakıyoruz)
    const stats = await Reading.aggregate([
      { $match: { Mahalle: mahalle } },
      {
        $group: {
          _id: null, // Tek bir sonuç istiyoruz
          avg_elektrik: { $avg: "$Elektrik_Tuketim" },
          avg_su: { $avg: "$Su_Tuketim" },
          avg_dogalgaz: { $avg: "$Dogalgaz_Tuketim" }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.status(404).json({ message: "Bu mahalle için veri bulunamadı." });
    }

    const currentStats = stats[0];

    // 2. TAHMİN ALGORİTMASI (Basit Matematik)
    // Gelecek ay, ortalamadan %5 daha fazla tüketim olacağını varsayıyoruz (Trend)
    const TREND_FACTOR = 1.05; 
    const GUN_SAYISI = 30; // 1 Aylık tahmin

    const tahmin = {
      mahalle: mahalle,
      tahmin_donemi: "Gelecek 30 Gün",
      elektrik_tahmini: (currentStats.avg_elektrik * GUN_SAYISI * TREND_FACTOR).toFixed(2),
      su_tahmini: (currentStats.avg_su * GUN_SAYISI * TREND_FACTOR).toFixed(2),
      dogalgaz_tahmini: (currentStats.avg_dogalgaz * GUN_SAYISI * TREND_FACTOR).toFixed(2),
      mesaj: "Tüketimlerin geçen aya göre %5 artış göstereceği öngörülmektedir."
    };

    res.status(200).json({
      success: true,
      data: tahmin
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};