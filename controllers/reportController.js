const { generateAndUploadReport } = require('../services/reportService');
const supabase = require('../config/supabase');
const Reading = require('../models/Reading'); // Veri çekmek için gerekli

// 1. İstatistik Özeti Raporu Oluştur
exports.generateMonthlyStatsReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        // Burada daha önce yazdığımız istatistik hesaplama mantığını kullanıyoruz
        // Örnek veri yapısı:
        const data = { title: `${month}/${year} İstatistik Raporu`, status: "Tamamlandı" }; 
        
        const publicUrl = await generateAndUploadReport(data, `Istatistik-${month}-${year}`);
        res.status(201).json({ message: "Rapor oluşturuldu", url: publicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Zaman Serisi Raporu Oluştur
exports.generateYearlyTimeSeriesReport = async (req, res) => {
    try {
        const { year } = req.query;
        const data = { title: `${year} Yılı Zaman Serisi Analizi`, status: "Yıllık Veri" };
        
        const publicUrl = await generateAndUploadReport(data, `ZamanSerisi-${year}`);
        res.status(201).json({ message: "Yıllık rapor hazır", url: publicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Korelasyon Raporu Oluştur
exports.generateCorrelationReport = async (req, res) => {
    try {
        const { month, year, season } = req.query;
        const data = { title: "Korelasyon Analiz Raporu", period: season || month };
        
        const publicUrl = await generateAndUploadReport(data, `Korelasyon-${season || month}`);
        res.status(201).json({ message: "Korelasyon raporu yüklendi", url: publicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Raporları Listele (Zaten yazmıştık)
exports.listReports = async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('analiz-raporlari')
            .list('reports');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Yardımcı fonksiyon: İstatistikleri hesapla (İstatistik endpoint'inden kopyaladık)
async function getFullStats(month, year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    return await Reading.aggregate([
        { 
            $match: { 
                Tarih: { $gte: start, $lte: end } 
            } 
        },
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
                hamKaynaklar: {
                    $push: {
                        k: "$_id.Kaynak",
                        v: {
                            $concat: [
                                { $toString: { $round: ["$Ort", 2] } }, " / ",
                                { $toString: { $round: ["$Zirve", 2] } }, " / ",
                                { $toString: { $round: ["$Dusuk", 2] } }
                            ]
                        }
                    }
                }
            }
        },
        // --- KRİTİK GÜVENLİK AŞAMASI ---
        {
            $project: {
                Mahalle: "$_id",
                // k veya v değeri null olan bozuk verileri temizliyoruz
                temizKaynaklar: {
                    $filter: {
                        input: "$hamKaynaklar",
                        as: "item",
                        cond: {
                            $and: [
                                { $ne: ["$$item.k", null] },
                                { $ne: ["$$item.v", null] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $project: {
                Mahalle: 1,
                // Sadece tamamen doğru yapıdaki diziyi nesneye çeviriyoruz
                data: { $arrayToObject: "$temizKaynaklar" }
            }
        },
        {
            $project: {
                Mahalle: 1,
                Elektrik: { $ifNull: ["$data.Elektrik", "Veri Yok"] },
                Su: { $ifNull: ["$data.Su", "Veri Yok"] },
                Dogalgaz: { $ifNull: ["$data.Dogalgaz", "Veri Yok"] }
            }
        }
    ]);
}

exports.generateMonthlyStatsReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        console.log("1. Veritabanı sorgusu başlatılıyor...");
        
        const stats = await getFullStats(month, year); 
        console.log("2. Veriler başarıyla çekildi. Sayı:", stats.length);

        const reportData = {
            title: `${month}/${year} Istatistik Ozeti Raporu`,
            subtitle: "Mahalle Bazli Tuketim Analizi",
            tableData: stats
        };

        console.log("3. PDF oluşturma ve yükleme başlatılıyor...");
        const publicUrl = await generateAndUploadReport(reportData, `Istatistik-${month}-${year}`);
        
        console.log("4. İşlem başarıyla bitti! URL:", publicUrl);
        res.status(201).json({ message: "Rapor hazir", url: publicUrl });
    } catch (error) {
        console.error("KRİTİK HATA:", error);
        res.status(500).json({ error: error.message });
    }
};