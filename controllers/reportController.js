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