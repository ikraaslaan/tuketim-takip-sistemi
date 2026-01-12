const { generateAndUploadReport } = require('../services/reportService');
const supabase = require('../config/supabase');
const Reading = require('../models/Reading'); // Veri çekmek için gerekli
const Incident = require('../models/Incident'); // Arıza verileri için

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

// Frontend için uyumlu endpoint'ler
exports.listDocuments = async (req, res) => {
    try {
        // Cache'i bypass etmek için timestamp ekle
        const { data, error } = await supabase.storage
            .from('analiz-raporlari')
            .list('reports', { 
                sort: { column: 'created_at', order: 'desc' },
                limit: 1000 // Tüm dosyaları getir
            });
        
        if (error) {
            console.error("Supabase list hatası:", error);
            throw error;
        }
        
        console.log(`📋 Supabase'den ${data?.length || 0} dosya bulundu`);
        
        // Frontend formatına çevir - Supabase'den gelen dosyaları işle
        // Dosya varlığını kontrol et ve sadece mevcut dosyaları döndür
        const validDocuments = [];
        
        for (const file of (data || [])) {
            try {
                const fileName = file.name || '';
                
                // Dosyanın gerçekten var olup olmadığını kontrol et (URL oluşturarak)
                const { data: urlData, error: urlError } = supabase.storage
                    .from('analiz-raporlari')
                    .getPublicUrl(`reports/${fileName}`);
                
                // Eğer URL oluşturulamazsa veya hata varsa, dosya muhtemelen silinmiş
                if (urlError || !urlData || !urlData.publicUrl) {
                    console.log(`⚠️ Dosya URL'si oluşturulamadı (silinmiş olabilir): ${fileName}`);
                    continue;
                }
                
                // Dosya adı formatı: rapor_2025_12_Aksaray-UUID.pdf veya Istatistik-1-2025-UUID.pdf
                const nameWithoutExt = fileName.replace('.pdf', '');
                const parts = nameWithoutExt.split('_');
                
                let neighborhood_name = 'Bilinmeyen';
                let month = '';
                let year = '';
                
                // Format: rapor_2025_12_Aksaray_su-UUID veya rapor_2025_12_Aksaray-UUID
                if (parts[0] === 'rapor' && parts.length >= 4) {
                    year = parts[1] || '';
                    month = parts[2] || '';
                    
                    // Son kısım mahalle adı + resource (varsa) + UUID olabilir
                    // Örnek: "Aksaray_su-UUID" veya "Aksaray-UUID"
                    let lastPart = parts.slice(3).join('_'); // Tüm kalan kısımları birleştir
                    
                    // UUID'yi kaldır (son tire'den sonrası, UUID formatı: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
                    const uuidPattern = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    lastPart = lastPart.replace(uuidPattern, '');
                    
                    // Resource bilgisini ayır (su, elektrik, dogalgaz)
                    let resourcePart = '';
                    if (lastPart.endsWith('_su')) {
                        resourcePart = 'su';
                        lastPart = lastPart.replace('_su', '');
                    } else if (lastPart.endsWith('_elektrik')) {
                        resourcePart = 'elektrik';
                        lastPart = lastPart.replace('_elektrik', '');
                    } else if (lastPart.endsWith('_dogalgaz')) {
                        resourcePart = 'dogalgaz';
                        lastPart = lastPart.replace('_dogalgaz', '');
                    }
                    
                    // Mahalle adını düzenle (alt çizgileri boşlukla değiştir, baş harfleri büyüt)
                    neighborhood_name = lastPart
                        .replace(/_/g, ' ') // Alt çizgileri boşlukla değiştir
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                        .trim() || 'Bilinmeyen';
                }
                // Format: Istatistik-1-2025-UUID (eski format)
                else if (nameWithoutExt.startsWith('Istatistik-')) {
                    const istParts = nameWithoutExt.split('-');
                    if (istParts.length >= 3) {
                        month = istParts[1] || '';
                        year = istParts[2] || '';
                        neighborhood_name = 'Tüm Mahalleler';
                    }
                }
                
                validDocuments.push({
                    id: file.name, // Dosya adını ID olarak kullan
                    name: file.name, // Dosya adını da ekle
                    neighborhood_name: neighborhood_name,
                    month: month,
                    year: year,
                    resource: fileName.includes('_elektrik') || fileName.includes('-elektrik') ? 'elektrik' : 
                             fileName.includes('_su') || fileName.includes('-su') ? 'su' : 
                             fileName.includes('_dogalgaz') || fileName.includes('-dogalgaz') ? 'dogalgaz' : 'all',
                    download_url: urlData.publicUrl,
                    report_date: file.created_at || file.updated_at || new Date().toISOString(),
                    created_at: file.created_at || new Date().toISOString()
                });
            } catch (fileError) {
                console.warn(`⚠️ Dosya işlenirken hata (${file.name}):`, fileError.message);
                // Hata olsa bile devam et
            }
        }
        
        console.log(`✅ ${validDocuments.length} geçerli belge döndürülüyor (toplam ${data?.length || 0} dosya)`);
        
        res.json({ success: true, data: validDocuments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.generateReport = async (req, res) => {
    try {
        const { month, year, mahalle, resource } = req.body;
        
        if (!mahalle) {
            return res.status(400).json({ success: false, message: 'Mahalle seçimi zorunludur' });
        }
        
        const m = parseInt(month);
        const y = parseInt(year);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        
        console.log(`📊 Rapor oluşturuluyor: ${mahalle} - ${month}/${year} - ${resource}`);
        
        // 1. Seçilen mahalle için veri çek
        const matchStage = {
            Mahalle: mahalle,
            Tarih: { $gte: start, $lte: end }
        };
        
        const results = await Reading.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$Mahalle",
                    e_avg: { $avg: "$Elektrik_Tuketim" },
                    e_max: { $max: "$Elektrik_Tuketim" },
                    e_min: { $min: "$Elektrik_Tuketim" },
                    s_avg: { $avg: "$Su_Tuketim" },
                    s_max: { $max: "$Su_Tuketim" },
                    s_min: { $min: "$Su_Tuketim" },
                    d_avg: { $avg: "$Dogalgaz_Tuketim" },
                    d_max: { $max: "$Dogalgaz_Tuketim" },
                    d_min: { $min: "$Dogalgaz_Tuketim" }
                }
            }
        ]);
        
        // 2. TÜM MAHALLELER için veri çek (şehir geneli grafik için)
        const allNeighborhoodsData = await Reading.aggregate([
            { $match: { Tarih: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: "$Mahalle",
                    e_avg: { $avg: "$Elektrik_Tuketim" },
                    s_avg: { $avg: "$Su_Tuketim" },
                    d_avg: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 3. ŞEHİR ORTALAMALARI hesapla
        const cityAverages = {
            elektrik: 0,
            su: 0,
            dogalgaz: 0
        };
        
        if (allNeighborhoodsData.length > 0) {
            const totalE = allNeighborhoodsData.reduce((sum, item) => sum + (item.e_avg || 0), 0);
            const totalS = allNeighborhoodsData.reduce((sum, item) => sum + (item.s_avg || 0), 0);
            const totalD = allNeighborhoodsData.reduce((sum, item) => sum + (item.d_avg || 0), 0);
            
            cityAverages.elektrik = totalE / allNeighborhoodsData.length;
            cityAverages.su = totalS / allNeighborhoodsData.length;
            cityAverages.dogalgaz = totalD / allNeighborhoodsData.length;
        }
        
        // 4. MEVSİMSEL ANALİZ verilerini çek
        const seasonalAnalysis = {};
        const seasonMonths = {
            'kış': [12, 1, 2],
            'ilkbahar': [3, 4, 5],
            'yaz': [6, 7, 8],
            'sonbahar': [9, 10, 11]
        };
        
        // Mevsimsel verileri hesapla
        for (const [seasonName, months] of Object.entries(seasonMonths)) {
            let seasonStart, seasonEnd;
            
            if (seasonName === 'kış') {
                // Kış: Aralık (önceki yıl), Ocak-Şubat (seçili yıl)
                seasonStart = new Date(y - 1, 11, 1);
                seasonEnd = new Date(y, 2, 0, 23, 59, 59);
            } else {
                seasonStart = new Date(y, months[0] - 1, 1);
                seasonEnd = new Date(y, months[months.length - 1], 0, 23, 59, 59);
            }
            
            const seasonData = await Reading.aggregate([
                { $match: { Tarih: { $gte: seasonStart, $lte: seasonEnd } } },
                {
                    $group: {
                        _id: null,
                        elektrik: { $avg: "$Elektrik_Tuketim" },
                        su: { $avg: "$Su_Tuketim" },
                        dogalgaz: { $avg: "$Dogalgaz_Tuketim" }
                    }
                }
            ]);
            
            if (seasonData.length > 0) {
                seasonalAnalysis[seasonName] = {
                    elektrik: seasonData[0].elektrik || 0,
                    su: seasonData[0].su || 0,
                    dogalgaz: seasonData[0].dogalgaz || 0
                };
            } else {
                seasonalAnalysis[seasonName] = {
                    elektrik: 0,
                    su: 0,
                    dogalgaz: 0
                };
            }
        }
        
        // 5. GRAFİK VERİLERİ hazırla (tüm mahalleler için)
        const chartData = allNeighborhoodsData.map(item => ({
            mahalle: item._id,
            label: item._id.substring(0, 8), // Kısa etiket
            value: resource === 'all' ? (item.e_avg || 0) + (item.s_avg || 0) + (item.d_avg || 0) :
                   resource === 'elektrik' ? (item.e_avg || 0) :
                   resource === 'su' ? (item.s_avg || 0) :
                   (item.d_avg || 0)
        }));
        
        // Resource filtresine göre verileri filtrele
        let stats = [];
        if (resource === 'all') {
            // Tüm kaynaklar
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: `${(item.e_avg || 0).toFixed(2)} / ${(item.e_max || 0).toFixed(2)} / ${(item.e_min || 0).toFixed(2)}`,
                Su: `${(item.s_avg || 0).toFixed(2)} / ${(item.s_max || 0).toFixed(2)} / ${(item.s_min || 0).toFixed(2)}`,
                Dogalgaz: `${(item.d_avg || 0).toFixed(2)} / ${(item.d_max || 0).toFixed(2)} / ${(item.d_min || 0).toFixed(2)}`
            }));
        } else if (resource === 'elektrik') {
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: `${(item.e_avg || 0).toFixed(2)} / ${(item.e_max || 0).toFixed(2)} / ${(item.e_min || 0).toFixed(2)}`,
                Su: '-',
                Dogalgaz: '-'
            }));
        } else if (resource === 'su') {
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: '-',
                Su: `${(item.s_avg || 0).toFixed(2)} / ${(item.s_max || 0).toFixed(2)} / ${(item.s_min || 0).toFixed(2)}`,
                Dogalgaz: '-'
            }));
        } else if (resource === 'dogalgaz') {
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: '-',
                Su: '-',
                Dogalgaz: `${(item.d_avg || 0).toFixed(2)} / ${(item.d_max || 0).toFixed(2)} / ${(item.d_min || 0).toFixed(2)}`
            }));
        }
        
        const reportData = {
            title: `${mahalle} - ${month}/${year} Raporu`,
            subtitle: resource === 'all' ? 'Tüm Kaynaklar' : (resource === 'elektrik' ? 'Elektrik' : resource === 'su' ? 'Su' : 'Doğalgaz'),
            tableData: stats,
            chartData: chartData,
            chartTitle: 'Şehir Geneli Tüketim Grafiği (Tüm Mahalleler)',
            cityAverages: cityAverages,
            seasonalAnalysis: seasonalAnalysis
        };
        
        // Dosya adı formatı: rapor_2025_12_Izzet_Pasa_su (resource bilgisi eklendi, düzenli format)
        const resourceSuffix = resource === 'all' ? '' : `_${resource}`;
        
        // Mahalle adını düzenle - Türkçe karakterleri İngilizce karşılıklarına çevir
        const turkishToEnglish = {
            'ç': 'c', 'Ç': 'C',
            'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S',
            'ü': 'u', 'Ü': 'U'
        };
        
        let cleanMahalle = mahalle;
        // Türkçe karakterleri değiştir
        Object.keys(turkishToEnglish).forEach(turkish => {
            cleanMahalle = cleanMahalle.replace(new RegExp(turkish, 'g'), turkishToEnglish[turkish]);
        });
        
        // Boşlukları alt çizgiyle değiştir, özel karakterleri kaldır, sadece harf, rakam ve alt çizgi bırak
        cleanMahalle = cleanMahalle
            .trim()
            .replace(/\s+/g, '_') // Boşlukları alt çizgiye çevir
            .replace(/[^a-zA-Z0-9_]/g, '') // Özel karakterleri kaldır
            .replace(/_+/g, '_') // Birden fazla alt çizgiyi tek alt çizgiye çevir
            .replace(/^_|_$/g, ''); // Başta ve sonda alt çizgi varsa kaldır
        
        const fileName = `rapor_${y}_${String(m).padStart(2, '0')}_${cleanMahalle}${resourceSuffix}`;
        console.log('📄 PDF oluşturuluyor, dosya adı:', fileName, 'Resource:', resource, 'Mahalle:', mahalle);
        
        // Aynı mahalle/ay/yıl/kaynak için mevcut PDF kontrolü
        try {
            const { data: existingFiles, error: listError } = await supabase.storage
                .from('analiz-raporlari')
                .list('reports');
            
            if (!listError && existingFiles && existingFiles.length > 0) {
                // Aynı mahalle, ay, yıl ve kaynak için dosya var mı kontrol et
                // Dosya adı formatı: rapor_2025_12_Aksaray_su-UUID.pdf
                // UUID'yi kaldırarak karşılaştır
                const baseFileNamePattern = fileName; // rapor_2025_12_Aksaray_su
                const existingFile = existingFiles.find(f => {
                    const nameWithoutExt = f.name.replace('.pdf', '');
                    // UUID formatı: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 karakter)
                    // Son tire'den sonra UUID başlar
                    const uuidPattern = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const nameWithoutUUID = nameWithoutExt.replace(uuidPattern, '');
                    // Base dosya adı ile karşılaştır
                    return nameWithoutUUID === baseFileNamePattern;
                });
                
                if (existingFile) {
                    console.log('⚠️ Aynı mahalle/ay/yıl/kaynak için zaten PDF mevcut:', existingFile.name);
                    return res.status(400).json({ 
                        success: false, 
                        message: `${mahalle} mahallesi için ${month}/${year} - ${resource === 'all' ? 'Tüm Kaynaklar' : (resource === 'elektrik' ? 'Elektrik' : resource === 'su' ? 'Su' : 'Doğalgaz')} raporu zaten mevcut. Lütfen mevcut raporu kullanın veya farklı bir filtre seçin.`,
                        existingFile: existingFile.name
                    });
                }
            }
        } catch (checkError) {
            console.warn("⚠️ Mevcut dosya kontrolü sırasında hata (devam ediliyor):", checkError.message);
            // Hata olsa bile PDF oluşturmaya devam et
        }
        
        // Her zaman yeni PDF oluştur (UUID ile, overwrite yok)
        const publicUrl = await generateAndUploadReport(reportData, fileName);
        
        console.log('✅ PDF oluşturuldu ve Supabase\'e yüklendi:', publicUrl);
        res.json({ success: true, data: { downloadUrl: publicUrl } });
    } catch (error) {
        console.error("Rapor oluşturma hatası:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStatisticalSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        const m = parseInt(month);
        const y = parseInt(year);
        
        // Mevcut ay verileri
        const currentStats = await getFullStats(m, y);
        
        // Önceki ay verileri (değişim hesaplaması için)
        let prevMonth = m - 1;
        let prevYear = y;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = y - 1;
        }
        const previousStats = await getFullStats(prevMonth, prevYear);
        
        // Değişim hesaplama fonksiyonu
        const calculateChange = (current, previous) => {
            if (!current || current === 0) {
                return null;
            }
            // Önceki ay verisi yoksa veya 0 ise, yeni veri olarak işaretle
            if (!previous || previous === 0) {
                return {
                    percentage: 'Yeni',
                    increased: false
                };
            }
            const percentage = ((current - previous) / previous) * 100;
            return {
                percentage: (percentage > 0 ? '+' : '') + percentage.toFixed(2) + '%',
                increased: percentage > 0
            };
        };
        
        // Frontend formatına çevir ve değişim ekle
        const formatted = currentStats.map(item => {
            const [e_avg, e_max, e_min] = item.Elektrik.split(' / ').map(v => parseFloat(v));
            const [s_avg, s_max, s_min] = item.Su.split(' / ').map(v => parseFloat(v));
            const [d_avg, d_max, d_min] = item.Dogalgaz.split(' / ').map(v => parseFloat(v));
            
            // Önceki ay verilerini bul
            const prevItem = previousStats.find(p => p.Mahalle === item.Mahalle);
            let prev_e_avg = 0, prev_s_avg = 0, prev_d_avg = 0;
            
            if (prevItem) {
                const [pe_avg] = prevItem.Elektrik.split(' / ').map(v => parseFloat(v));
                const [ps_avg] = prevItem.Su.split(' / ').map(v => parseFloat(v));
                const [pd_avg] = prevItem.Dogalgaz.split(' / ').map(v => parseFloat(v));
                prev_e_avg = pe_avg || 0;
                prev_s_avg = ps_avg || 0;
                prev_d_avg = pd_avg || 0;
            }
            
            const elektrikChange = calculateChange(e_avg, prev_e_avg);
            const suChange = calculateChange(s_avg, prev_s_avg);
            const dogalgazChange = calculateChange(d_avg, prev_d_avg);
            
            // Debug log
            if (item.Mahalle === 'Hilalkent' || item.Mahalle === 'Aksaray') {
                console.log(`📊 ${item.Mahalle} - Elektrik: ${e_avg} vs ${prev_e_avg} = ${elektrikChange?.percentage || 'null'}`);
                console.log(`📊 ${item.Mahalle} - Su: ${s_avg} vs ${prev_s_avg} = ${suChange?.percentage || 'null'}`);
                console.log(`📊 ${item.Mahalle} - Doğalgaz: ${d_avg} vs ${prev_d_avg} = ${dogalgazChange?.percentage || 'null'}`);
            }
            
            return {
                mahalle: item.Mahalle,
                elektrik: { 
                    average: e_avg, 
                    peak: e_max, 
                    lowest: e_min,
                    change: elektrikChange
                },
                su: { 
                    average: s_avg, 
                    peak: s_max, 
                    lowest: s_min,
                    change: suChange
                },
                dogalgaz: { 
                    average: d_avg, 
                    peak: d_max, 
                    lowest: d_min,
                    change: dogalgazChange
                }
            };
        });
        
        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error("İstatistik özeti hatası:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTimeSeriesAnalysis = async (req, res) => {
    try {
        const { year } = req.query;
        const selectedYear = year ? parseInt(year) : new Date().getFullYear();
        
        const startDate = new Date(selectedYear, 0, 1);
        const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
        
        // Mevsimsel tüketim analizi (ay bazlı)
        const monthlyConsumption = await Reading.aggregate([
            {
                $match: {
                    Tarih: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$Tarih" } },
                    elektrik_avg: { $avg: "$Elektrik_Tuketim" },
                    su_avg: { $avg: "$Su_Tuketim" },
                    dogalgaz_avg: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);
        
        // Mevsimleri belirle (Kış: 12,1,2 | İlkbahar: 3,4,5 | Yaz: 6,7,8 | Sonbahar: 9,10,11)
        const seasonalData = {
            kış: { months: [12, 1, 2], elektrik: [], su: [], dogalgaz: [] },
            ilkbahar: { months: [3, 4, 5], elektrik: [], su: [], dogalgaz: [] },
            yaz: { months: [6, 7, 8], elektrik: [], su: [], dogalgaz: [] },
            sonbahar: { months: [9, 10, 11], elektrik: [], su: [], dogalgaz: [] }
        };
        
        monthlyConsumption.forEach(item => {
            const month = item._id.month;
            let season = null;
            
            if (seasonalData.kış.months.includes(month)) season = seasonalData.kış;
            else if (seasonalData.ilkbahar.months.includes(month)) season = seasonalData.ilkbahar;
            else if (seasonalData.yaz.months.includes(month)) season = seasonalData.yaz;
            else if (seasonalData.sonbahar.months.includes(month)) season = seasonalData.sonbahar;
            
            if (season) {
                season.elektrik.push(item.elektrik_avg || 0);
                season.su.push(item.su_avg || 0);
                season.dogalgaz.push(item.dogalgaz_avg || 0);
            }
        });
        
        // Mevsimsel ortalamaları hesapla
        const seasonalConsumption = {};
        Object.keys(seasonalData).forEach(seasonKey => {
            const season = seasonalData[seasonKey];
            const calcAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            
            seasonalConsumption[seasonKey] = {
                name: seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1),
                elektrik: {
                    average: calcAvg(season.elektrik),
                    min: season.elektrik.length > 0 ? Math.min(...season.elektrik) : 0,
                    max: season.elektrik.length > 0 ? Math.max(...season.elektrik) : 0
                },
                su: {
                    average: calcAvg(season.su),
                    min: season.su.length > 0 ? Math.min(...season.su) : 0,
                    max: season.su.length > 0 ? Math.max(...season.su) : 0
                },
                dogalgaz: {
                    average: calcAvg(season.dogalgaz),
                    min: season.dogalgaz.length > 0 ? Math.min(...season.dogalgaz) : 0,
                    max: season.dogalgaz.length > 0 ? Math.max(...season.dogalgaz) : 0
                }
            };
        });
        
        // Mevsimsel arıza analizi
        const monthlyIncidents = await Incident.aggregate([
            {
                $match: {
                    Baslangic_Tarihi: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$Baslangic_Tarihi" }, resource: "$Kaynak_Tipi" },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const seasonalIncidents = {
            kış: { months: [12, 1, 2], incidents: [] },
            ilkbahar: { months: [3, 4, 5], incidents: [] },
            yaz: { months: [6, 7, 8], incidents: [] },
            sonbahar: { months: [9, 10, 11], incidents: [] }
        };
        
        monthlyIncidents.forEach(item => {
            const month = item._id.month;
            let season = null;
            
            if (seasonalIncidents.kış.months.includes(month)) season = seasonalIncidents.kış;
            else if (seasonalIncidents.ilkbahar.months.includes(month)) season = seasonalIncidents.ilkbahar;
            else if (seasonalIncidents.yaz.months.includes(month)) season = seasonalIncidents.yaz;
            else if (seasonalIncidents.sonbahar.months.includes(month)) season = seasonalIncidents.sonbahar;
            
            if (season) {
                season.incidents.push({ resource: item._id.resource, count: item.count });
            }
        });
        
        // Mevsimsel arıza özeti
        const seasonalIncidentsSummary = {};
        Object.keys(seasonalIncidents).forEach(seasonKey => {
            const season = seasonalIncidents[seasonKey];
            const byResource = { Elektrik: 0, Su: 0, Dogalgaz: 0 };
            let total = 0;
            
            season.incidents.forEach(inc => {
                byResource[inc.resource] = (byResource[inc.resource] || 0) + inc.count;
                total += inc.count;
            });
            
            seasonalIncidentsSummary[seasonKey] = {
                name: seasonKey.charAt(0).toUpperCase() + seasonKey.slice(1),
                count: total,
                byResource: byResource
            };
        });
        
        res.json({ 
            success: true, 
            data: {
                seasonalConsumption: seasonalConsumption,
                seasonalIncidents: seasonalIncidentsSummary
            }
        });
    } catch (error) {
        console.error("Zaman serisi analizi hatası:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        let { id } = req.params;
        id = decodeURIComponent(id);
        console.log('🗑️ Silinecek belge ID:', id);
        
        // Önce dosya listesini al
        const { data: files, error: listError } = await supabase.storage
            .from('analiz-raporlari')
            .list('reports');
        
        if (listError) {
            console.error('❌ Dosya listesi alınamadı:', listError);
            throw listError;
        }
        
        // ID'ye göre dosyayı bul
        let fileToDelete = null;
        if (files && files.length > 0) {
            // Önce tam dosya adı olarak dene
            fileToDelete = files.find(f => f.name === id);
            // Eğer bulunamazsa, dosya adının bir kısmını içeren dosyayı bul
            if (!fileToDelete) {
                fileToDelete = files.find(f => f.name.includes(id) || f.id === id);
            }
            // Hala bulunamazsa, URL'den dosya adını çıkar
            if (!fileToDelete && id.includes('/')) {
                const fileNameFromUrl = id.split('/').pop().split('?')[0];
                fileToDelete = files.find(f => f.name === fileNameFromUrl);
            }
        }
        
        // Dosya adını belirle
        let fileName = id;
        if (fileToDelete) {
            fileName = fileToDelete.name;
        } else if (id.includes('/')) {
            // URL'den dosya adını çıkar
            fileName = id.split('/').pop().split('?')[0];
        }
        
        console.log('🗑️ Silinecek dosya adı:', fileName);
        
        // Supabase'den dosyayı sil
        const { error: deleteError } = await supabase.storage
            .from('analiz-raporlari')
            .remove([`reports/${fileName}`]);
        
        if (deleteError) {
            console.error('❌ Supabase silme hatası:', deleteError);
            throw deleteError;
        }
        
        console.log('✅ Belge başarıyla silindi:', fileName);
        res.json({ success: true, message: 'Belge Supabase\'den silindi' });
    } catch (error) {
        console.error('❌ Belge silme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Korelasyon Analizi - Ayrı endpoint
exports.getCorrelationAnalysis = async (req, res) => {
    try {
        const { year, month, season, mahalle } = req.query;
        const selectedYear = year ? parseInt(year) : new Date().getFullYear();
        
        // Mevsimleri belirle
        const getSeason = (monthNum) => {
            if ([12, 1, 2].includes(monthNum)) return 'Kış';
            if ([3, 4, 5].includes(monthNum)) return 'İlkbahar';
            if ([6, 7, 8].includes(monthNum)) return 'Yaz';
            if ([9, 10, 11].includes(monthNum)) return 'Sonbahar';
            return 'Bilinmeyen';
        };
        
        // Mevsim aylarını belirle
        const getSeasonMonths = (seasonName) => {
            if (seasonName === 'kis') return [12, 1, 2]; // Kış
            if (seasonName === 'ilkbahar') return [3, 4, 5]; // İlkbahar
            if (seasonName === 'yaz') return [6, 7, 8]; // Yaz
            if (seasonName === 'sonbahar') return [9, 10, 11]; // Sonbahar
            return [];
        };
        
        // Tarih aralığını belirle
        let startDate, endDate;
        
        if (season) {
            // Mevsim seçildi
            const seasonMonths = getSeasonMonths(season);
            
            // Kış mevsimi için özel durum (Aralık önceki yıl, Ocak-Şubat seçili yıl)
            if (season === 'kis') {
                startDate = new Date(selectedYear - 1, 11, 1); // Önceki yıl Aralık
                endDate = new Date(selectedYear, 2, 0, 23, 59, 59); // Seçili yıl Şubat sonu
            } else {
                // Diğer mevsimler için normal
                startDate = new Date(selectedYear, seasonMonths[0] - 1, 1);
                endDate = new Date(selectedYear, seasonMonths[seasonMonths.length - 1], 0, 23, 59, 59);
            }
        } else if (month) {
            // Ay seçildi - o ayın ait olduğu mevsimin tüm aylarını al
            const selectedMonth = parseInt(month);
            const monthSeason = getSeason(selectedMonth);
            const seasonMonths = getSeasonMonths(monthSeason === 'Kış' ? 'kis' : 
                                                  monthSeason === 'İlkbahar' ? 'ilkbahar' :
                                                  monthSeason === 'Yaz' ? 'yaz' : 'sonbahar');
            
            // Kış mevsimi için özel durum
            if (monthSeason === 'Kış') {
                startDate = new Date(selectedYear - 1, 11, 1); // Önceki yıl Aralık
                endDate = new Date(selectedYear, 2, 0, 23, 59, 59); // Seçili yıl Şubat sonu
            } else {
                // Diğer mevsimler için normal
                startDate = new Date(selectedYear, seasonMonths[0] - 1, 1);
                endDate = new Date(selectedYear, seasonMonths[seasonMonths.length - 1], 0, 23, 59, 59);
            }
        } else {
            // Tüm yıl
            startDate = new Date(selectedYear, 0, 1);
            endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
        }
        
        // Match stage oluştur
        const matchStage = {
            Tarih: { $gte: startDate, $lte: endDate }
        };
        
        // Mahalle filtresi ekle
        if (mahalle) {
            matchStage.Mahalle = mahalle;
        }
        
        // Aylık tüketim verilerini çek
        const monthlyData = await Reading.aggregate([
            {
                $match: matchStage
            },
            {
                $group: {
                    _id: { month: { $month: "$Tarih" } },
                    elektrik: { $avg: "$Elektrik_Tuketim" },
                    su: { $avg: "$Su_Tuketim" },
                    dogalgaz: { $avg: "$Dogalgaz_Tuketim" }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);
        
        // Mevsimsel toplamları hesapla
        const seasonalTotals = {
            'Kış': { elektrik: [], su: [], dogalgaz: [] },
            'İlkbahar': { elektrik: [], su: [], dogalgaz: [] },
            'Yaz': { elektrik: [], su: [], dogalgaz: [] },
            'Sonbahar': { elektrik: [], su: [], dogalgaz: [] }
        };
        
        monthlyData.forEach(item => {
            const season = getSeason(item._id.month);
            if (seasonalTotals[season]) {
                seasonalTotals[season].elektrik.push(item.elektrik || 0);
                seasonalTotals[season].su.push(item.su || 0);
                seasonalTotals[season].dogalgaz.push(item.dogalgaz || 0);
            }
        });
        
        // Eğer mevsim veya ay seçildiyse, sadece o mevsimin verilerini göster
        if (season || month) {
            let selectedSeasonName = '';
            if (season) {
                // Mevsim seçildi
                const seasonMap = {
                    'kis': 'Kış',
                    'ilkbahar': 'İlkbahar',
                    'yaz': 'Yaz',
                    'sonbahar': 'Sonbahar'
                };
                selectedSeasonName = seasonMap[season] || '';
            } else if (month) {
                // Ay seçildi - o ayın ait olduğu mevsimi bul
                const selectedMonth = parseInt(month);
                selectedSeasonName = getSeason(selectedMonth);
            }
            
            // Diğer mevsimlerin verilerini temizle
            Object.keys(seasonalTotals).forEach(seasonKey => {
                if (seasonKey !== selectedSeasonName) {
                    seasonalTotals[seasonKey] = { elektrik: [], su: [], dogalgaz: [] };
                }
            });
        }
        
        // Her kaynak için zirve ve en düşük mevsimi bul
        const correlations = [];
        const resources = [
            { key: 'elektrik', name: 'Elektrik', unit: 'kWh' },
            { key: 'su', name: 'Su', unit: 'm³' },
            { key: 'dogalgaz', name: 'Doğalgaz', unit: 'm³' }
        ];
        
        resources.forEach(resource => {
            const seasonAverages = {};
            Object.keys(seasonalTotals).forEach(season => {
                const values = seasonalTotals[season][resource.key];
                seasonAverages[season] = values.length > 0 
                    ? values.reduce((a, b) => a + b, 0) / values.length 
                    : 0;
            });
            
            // Zirve ve en düşük mevsimi bul
            let peakSeason = '';
            let peakValue = 0;
            let lowestSeason = '';
            let lowestValue = Infinity;
            
            Object.keys(seasonAverages).forEach(season => {
                const avg = seasonAverages[season];
                if (avg > peakValue) {
                    peakValue = avg;
                    peakSeason = season;
                }
                if (avg < lowestValue && avg > 0) {
                    lowestValue = avg;
                    lowestSeason = season;
                }
            });
            
            if (peakSeason && lowestSeason) {
                correlations.push({
                    resource: resource.name,
                    peakSeason: peakSeason,
                    peakValue: peakValue,
                    lowestSeason: lowestSeason,
                    lowestValue: lowestValue,
                    unit: resource.unit,
                    seasonalAverages: seasonAverages
                });
            }
        });
        
        res.json({
            success: true,
            data: {
                correlations: correlations,
                year: selectedYear
            }
        });
    } catch (error) {
        console.error("Korelasyon analizi hatası:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};