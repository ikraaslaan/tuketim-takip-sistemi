const Reading = require('../models/Reading');
const Incident = require('../models/Incident');

/**
 * Test endpoint - Veritabanında kaç kayıt var kontrol et
 * GET /api/stats/test
 */
exports.testDatabase = async (req, res) => {
  try {
    const totalCount = await Reading.countDocuments();
    const sampleData = await Reading.find().limit(5);
    const distinctMahalle = await Reading.distinct('Mahalle');
    const distinctKaynak = await Reading.distinct('Kaynak_Tipi');
    
    res.json({
      success: true,
      totalRecords: totalCount,
      distinctNeighborhoods: distinctMahalle.length,
      neighborhoods: distinctMahalle,
      distinctResourceTypes: distinctKaynak,
      sampleRecords: sampleData
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Dashboard için mahalle bazlı ortalama istatistikler
 * GET /api/stats/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Her mahalle için ortalama değerleri hesapla
    const stats = await Reading.aggregate([
      {
        $group: {
          _id: '$Mahalle',
          elektrikOrtalama: { $avg: '$Elektrik_Tuketim' },
          suOrtalama: { $avg: '$Su_Tuketim' },
          dogalgazOrtalama: { $avg: '$Dogalgaz_Tuketim' },
          kayitSayisi: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          mahalle: '$_id',
          elektrik: {
            ortalama: { $round: ['$elektrikOrtalama', 2] }
          },
          su: {
            ortalama: { $round: ['$suOrtalama', 2] }
          },
          dogalgaz: {
            ortalama: { $round: ['$dogalgazOrtalama', 2] }
          },
          kayitSayisi: 1
        }
      },
      {
        $sort: { mahalle: 1 }
      }
    ]);

    res.json({
      success: true,
      data: stats,
      count: stats.length
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard verileri alınırken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Her mahalle için en son kaydı getir (modal için)
 * Aktif kesintiler varsa, o kaynaklar için 0 döndürür
 * GET /api/stats/latest
 */
exports.getLatestReadings = async (req, res) => {
  try {
    // Her mahalle için en son kaydı getir
    const latestReadings = await Reading.aggregate([
      {
        $sort: { Tarih: -1 } // En yeni kayıtlar önce
      },
      {
        $group: {
          _id: '$Mahalle',
          // En son kaydın tüm alanlarını al
          Elektrik_Tuketim: { $first: '$Elektrik_Tuketim' },
          Su_Tuketim: { $first: '$Su_Tuketim' },
          Dogalgaz_Tuketim: { $first: '$Dogalgaz_Tuketim' },
          Tarih: { $first: '$Tarih' }
        }
      },
      {
        $project: {
          _id: 0,
          mahalle: '$_id',
          elektrik: {
            ortalama: { $round: ['$Elektrik_Tuketim', 2] }
          },
          su: {
            ortalama: { $round: ['$Su_Tuketim', 2] }
          },
          dogalgaz: {
            ortalama: { $round: ['$Dogalgaz_Tuketim', 2] }
          },
          tarih: '$Tarih'
        }
      },
      {
        $sort: { mahalle: 1 }
      }
    ]);

    // Aktif kesintileri kontrol et
    const now = new Date();
    // Hem planlı hem anlık kesintileri kontrol et
    // Planlı kesintiler: Baslangic_Tarihi <= now <= Bitis_Tarihi ve Durum = 'Aktif'
    // Anlık kesintiler: Baslangic_Tarihi <= now ve Durum = 'Aktif' (Bitis_Tarihi kontrolü yok)
    const activeIncidents = await Incident.find({
      Durum: { $in: ['Aktif', 'AKTIF'] },
      Baslangic_Tarihi: { $lte: now },
      $or: [
        { 
          // Planlı kesintiler: Bitis_Tarihi var ve >= now
          Bitis_Tarihi: { $exists: true, $ne: null, $gte: now }
        },
        { 
          // Anlık kesintiler: Bitis_Tarihi yok veya null
          $or: [
            { Bitis_Tarihi: { $exists: false } },
            { Bitis_Tarihi: null }
          ]
        }
      ]
    });

    // Mahalle ve kaynak bazında aktif kesintileri grupla
    const incidentMap = {};
    activeIncidents.forEach(incident => {
      const mahalle = incident.Mahalle;
      const kaynak = incident.Kaynak_Tipi;
      
      if (!incidentMap[mahalle]) {
        incidentMap[mahalle] = new Set();
      }
      // Kaynak tipini normalize et (Doğalgaz -> Dogalgaz)
      const normalizedKaynak = kaynak === 'Doğalgaz' ? 'Dogalgaz' : kaynak;
      incidentMap[mahalle].add(normalizedKaynak);
    });

    // Aktif kesintiler varsa, ilgili kaynakların değerlerini 0 yap
    const result = latestReadings.map(reading => {
      const mahalle = reading.mahalle;
      const activeSources = incidentMap[mahalle];
      
      if (activeSources && activeSources.size > 0) {
        // Bu mahalle için aktif kesinti var
        const updatedReading = { ...reading };
        
        // Aktif kesinti olan kaynakların değerlerini 0 yap
        if (activeSources.has('Elektrik')) {
          updatedReading.elektrik.ortalama = 0;
          console.log(`🔌 ${mahalle} için Elektrik kesintisi aktif - değer 0 yapıldı`);
        }
        if (activeSources.has('Su')) {
          updatedReading.su.ortalama = 0;
          console.log(`💧 ${mahalle} için Su kesintisi aktif - değer 0 yapıldı`);
        }
        if (activeSources.has('Dogalgaz')) {
          updatedReading.dogalgaz.ortalama = 0;
          console.log(`🔥 ${mahalle} için Doğalgaz kesintisi aktif - değer 0 yapıldı`);
        }
        
        return updatedReading;
      }
      
      return reading;
    });

    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error('Latest readings error:', error);
    res.status(500).json({
      success: false,
      message: 'En son kayıtlar alınırken hata oluştu',
      error: error.message
    });
  }
};

/**
 * Zaman serisi verileri (son 7 gün veya tüm veriler)
 * GET /api/stats/timeseries?mahalle=Aksaray&kaynak=elektrik&days=7
 */
exports.getTimeSeries = async (req, res) => {
  try {
    const { mahalle, kaynak, days } = req.query;
    
    if (!mahalle || !kaynak) {
      return res.status(400).json({
        success: false,
        message: 'Mahalle ve kaynak parametreleri gereklidir'
      });
    }

    // Kaynak tipine göre alan adını belirle
    let fieldName;
    if (kaynak.toLowerCase() === 'elektrik') {
      fieldName = 'Elektrik_Tuketim';
    } else if (kaynak.toLowerCase() === 'su') {
      fieldName = 'Su_Tuketim';
    } else if (kaynak.toLowerCase() === 'dogalgaz') {
      fieldName = 'Dogalgaz_Tuketim';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kaynak tipi. elektrik, su veya dogalgaz olmalı'
      });
    }

    // Tarih filtresi oluştur
    let matchStage = {
      Mahalle: mahalle
    };

    // Eğer days parametresi varsa, tarih filtresi ekle
    if (days && !isNaN(parseInt(days))) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      matchStage.Tarih = { $gte: daysAgo };
    }

    // Zaman serisi verilerini çek
    // ÖNEMLİ: Her gün için en son kaydı almak için önce tarih bazında sıralama yapıyoruz
    const timeSeriesData = await Reading.aggregate([
      {
        $match: matchStage
      },
      // Önce tüm kayıtları tarih ve saat bazında sırala (en yeni önce)
      {
        $sort: { Tarih: -1 }
      },
      {
        $project: {
          _id: 0,
          Tarih: 1, // Orijinal tarih alanını koru (sıralama için)
          tarih: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$Tarih'
            }
          },
          tuketim: `$${fieldName}`
        }
      },
      // Tarih bazında grupla ve her gün için en son kaydı al (ilk kayıt, çünkü en yeni önce sıraladık)
      {
        $group: {
          _id: '$tarih',
          value: { $first: '$tuketim' }, // En son kaydı al (ortalama yerine)
          Tarih: { $first: '$Tarih' } // En son tarihi al
        }
      },
      {
        $project: {
          _id: 0,
          tarih: '$_id',
          value: { $round: ['$value', 2] }
        }
      },
      {
        $sort: { tarih: -1 }
      },
      {
        $limit: days && !isNaN(parseInt(days)) ? parseInt(days) : 100
      },
      {
        $sort: { tarih: 1 }
      }
    ]);

    // İstatistikleri hesapla
    let statistics = null;
    if (timeSeriesData.length > 0) {
      const values = timeSeriesData.map(d => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      statistics = {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        ortalama: Math.round(avg * 100) / 100,
        toplamKayit: timeSeriesData.length
      };
    }

    res.json({
      success: true,
      data: {
        timeSeries: timeSeriesData,
        statistics: statistics
      }
    });
  } catch (error) {
    console.error('Time series error:', error);
    res.status(500).json({
      success: false,
      message: 'Zaman serisi verileri alınırken hata oluştu',
      error: error.message
    });
  }
};
