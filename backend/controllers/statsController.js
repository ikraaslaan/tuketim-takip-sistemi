const Reading = require('../models/Reading');

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
    const timeSeriesData = await Reading.aggregate([
      {
        $match: matchStage
      },
      {
        $project: {
          _id: 0,
          tarih: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$Tarih'
            }
          },
          tuketim: `$${fieldName}`
        }
      },
      {
        $group: {
          _id: '$tarih',
          ortalama: { $avg: '$tuketim' }
        }
      },
      {
        $project: {
          _id: 0,
          tarih: '$_id',
          value: { $round: ['$ortalama', 2] }
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
