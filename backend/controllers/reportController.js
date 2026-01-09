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
    const m = parseInt(month);
    const y = parseInt(year);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    console.log(`🔍 Sorgu Aralığı: ${start.toISOString()} - ${end.toISOString()}`);

    const results = await Reading.aggregate([
        // 1. Tarih Aralığı Filtreleme
        { $match: { Tarih: { $gte: start, $lte: end } } },
        
        // 2. Mahalle bazlı grupla ve 3 kaynak için de ayrı ayrı hesapla
        {
            $group: {
                _id: "$Mahalle",
                // Elektrik Analizi
                e_avg: { $avg: "$Elektrik_Tuketim" },
                e_max: { $max: "$Elektrik_Tuketim" },
                e_min: { $min: "$Elektrik_Tuketim" },
                // Su Analizi
                s_avg: { $avg: "$Su_Tuketim" },
                s_max: { $max: "$Su_Tuketim" },
                s_min: { $min: "$Su_Tuketim" },
                // Doğalgaz Analizi
                d_avg: { $avg: "$Dogalgaz_Tuketim" },
                d_max: { $max: "$Dogalgaz_Tuketim" },
                d_min: { $min: "$Dogalgaz_Tuketim" }
            }
        }
    ]);

    console.log(`📊 DB'den Bulunan Mahalle Sayısı: ${results.length}`);

    // PDF için verileri formatla
    return results.map(item => ({
        Mahalle: item._id,
        Elektrik: `${(item.e_avg || 0).toFixed(2)} / ${(item.e_max || 0).toFixed(2)} / ${(item.e_min || 0).toFixed(2)}`,
        Su: `${(item.s_avg || 0).toFixed(2)} / ${(item.s_max || 0).toFixed(2)} / ${(item.s_min || 0).toFixed(2)}`,
        Dogalgaz: `${(item.d_avg || 0).toFixed(2)} / ${(item.d_max || 0).toFixed(2)} / ${(item.d_min || 0).toFixed(2)}`
    }));
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