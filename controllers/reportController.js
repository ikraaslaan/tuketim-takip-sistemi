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
    const end = new Date(year, month, 0, 23, 59, 59); // Ayın son günü

    return await Reading.aggregate([
        // 1. Aşama: İlgili ay ve yıldaki verileri filtrele
        { 
            $match: { 
                Tarih: { $gte: start, $lte: end } 
            } 
        },
        // 2. Aşama: Mahalle ve Kaynak Tipine göre grupla, analizleri yap
        {
            $group: {
                _id: { Mahalle: "$Mahalle", Kaynak: "$Kaynak_Tipi" },
                Ort: { $avg: "$Tuketim_Miktari" },
                Zirve: { $max: "$Tuketim_Miktari" },
                Dusuk: { $min: "$Tuketim_Miktari" }
            }
        },
        // 3. Aşama: Veriyi mahalle bazında birleştir (Pivot)
        {
            $group: {
                _id: "$_id.Mahalle",
                kaynaklar: {
                    $push: {
                        k: "$_id.Kaynak",
                        v: {
                            stats: {
                                $concat: [
                                    { $toString: { $round: ["$Ort", 2] } }, " / ",
                                    { $toString: { $round: ["$Zirve", 2] } }, " / ",
                                    { $toString: { $round: ["$Dusuk", 2] } }
                                ]
                            }
                        }
                    }
                }
            }
        },
        // 4. Aşama: Çıktıyı PDF'e uygun formatla
        {
            $project: {
                _id: 0,
                Mahalle: "$_id",
                data: { $arrayToObject: "$kaynaklar" }
            }
        },
        {
            $project: {
                Mahalle: 1,
                Elektrik: "$data.Elektrik.stats",
                Su: "$data.Su.stats",
                Dogalgaz: "$data.Dogalgaz.stats"
            }
        }
    ]);
}

exports.generateMonthlyStatsReport = async (req, res) => {
    try {
        const { month, year } = req.query;
        
        // 1. Gerçek veriyi DB'den çek
        const stats = await getFullStats(month, year); 

        // 2. PDF Servisine gerçek veriyi ve başlığı gönder
        const reportData = {
            title: `${month}/${year} İstatistik Özeti Raporu`,
            subtitle: "Mahalle Bazlı Tüketim ve Değişim Analizi",
            tableData: stats // Gerçek dizi buraya gidiyor
        };
        
        const publicUrl = await generateAndUploadReport(reportData, `Istatistik-${month}-${year}`);
        res.status(201).json({ message: "Gerçek veriyle rapor oluşturuldu", url: publicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};