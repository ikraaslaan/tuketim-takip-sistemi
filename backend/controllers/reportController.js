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

// Frontend için uyumlu endpoint'ler
exports.listDocuments = async (req, res) => {
    try {
        const { data, error } = await supabase.storage
            .from('analiz-raporlari')
            .list('reports', { sort: { column: 'created_at', order: 'desc' } });
        
        if (error) throw error;
        
        // Frontend formatına çevir - Supabase'den gelen dosyaları işle
        const documents = (data || []).map((file, index) => {
            const fileName = file.name || '';
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
                
                // Mahalle adını düzenle (tire'leri boşlukla değiştir, baş harfleri büyüt)
                neighborhood_name = lastPart
                    .replace(/_/g, ' ') // Alt çizgileri boşlukla değiştir
                    .replace(/\b\w/g, l => l.toUpperCase()) // Her kelimenin ilk harfini büyüt
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
            
            // Public URL oluştur
            const { data: urlData } = supabase.storage
                .from('analiz-raporlari')
                .getPublicUrl(`reports/${fileName}`);
            
            return {
                id: file.name, // Dosya adını ID olarak kullan (silme için gerekli)
                name: file.name, // Dosya adını da ekle
                neighborhood_name: neighborhood_name,
                month: month,
                year: year,
                resource: fileName.includes('_elektrik') || fileName.includes('-elektrik') ? 'elektrik' : 
                         fileName.includes('_su') || fileName.includes('-su') ? 'su' : 
                         fileName.includes('_dogalgaz') || fileName.includes('-dogalgaz') ? 'dogalgaz' : 'all',
                download_url: urlData?.publicUrl || null,
                report_date: file.created_at || file.updated_at || new Date().toISOString(),
                created_at: file.created_at || new Date().toISOString()
            };
        });
        
        res.json({ success: true, data: documents });
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
        
        // Mahalle bazlı veri çek
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
            // Sadece Elektrik
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: `${(item.e_avg || 0).toFixed(2)} / ${(item.e_max || 0).toFixed(2)} / ${(item.e_min || 0).toFixed(2)}`,
                Su: '-',
                Dogalgaz: '-'
            }));
        } else if (resource === 'su') {
            // Sadece Su
            stats = results.map(item => ({
                Mahalle: item._id,
                Elektrik: '-',
                Su: `${(item.s_avg || 0).toFixed(2)} / ${(item.s_max || 0).toFixed(2)} / ${(item.s_min || 0).toFixed(2)}`,
                Dogalgaz: '-'
            }));
        } else if (resource === 'dogalgaz') {
            // Sadece Doğalgaz
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
            tableData: stats
        };
        
        // Dosya adı formatı: rapor_2025_12_Aksaray_su (resource bilgisi eklendi, düzenli format)
        const resourceSuffix = resource === 'all' ? '' : `_${resource}`;
        // Mahalle adını düzenle (boşlukları alt çizgiyle değiştir, özel karakterleri kaldır)
        const cleanMahalle = mahalle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const fileName = `rapor_${y}_${String(m).padStart(2, '0')}_${cleanMahalle}${resourceSuffix}`;
        console.log('📄 PDF oluşturuluyor, dosya adı:', fileName, 'Resource:', resource, 'Mahalle:', mahalle);
        
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
        const stats = await getFullStats(month, year);
        
        // Frontend formatına çevir
        const formatted = stats.map(item => {
            const [e_avg, e_max, e_min] = item.Elektrik.split(' / ').map(v => parseFloat(v));
            const [s_avg, s_max, s_min] = item.Su.split(' / ').map(v => parseFloat(v));
            const [d_avg, d_max, d_min] = item.Dogalgaz.split(' / ').map(v => parseFloat(v));
            
            return {
                mahalle: item.Mahalle,
                elektrik: { average: e_avg, peak: e_max, lowest: e_min },
                su: { average: s_avg, peak: s_max, lowest: s_min },
                dogalgaz: { average: d_avg, peak: d_max, lowest: d_min }
            };
        });
        
        res.json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTimeSeriesAnalysis = async (req, res) => {
    try {
        const { year } = req.query;
        // Basit bir zaman serisi analizi döndür
        res.json({ 
            success: true, 
            data: {
                seasonalConsumption: {},
                seasonalIncidents: {},
                correlations: []
            }
        });
    } catch (error) {
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