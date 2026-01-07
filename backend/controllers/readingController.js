const Reading = require('../models/Reading');
const Incident = require('../models/Incident');

exports.createReading = async (req, res) => {
  try {
    // Frontend veya Sensörden gelen veri yapısı
    const { Tarih, Mahalle, Elektrik_Tuketim, Su_Tuketim, Dogalgaz_Tuketim } = req.body;

    // 1. Veriyi Kaydet (Senin var olan yapına uygun)
    const newReading = await Reading.create({
      Tarih: Tarih || new Date(), // Tarih gelmezse şu anı al
      Mahalle,
      Elektrik_Tuketim,
      Su_Tuketim,
      Dogalgaz_Tuketim
    });

    // 2. ANOMALİ KONTROLLERİ (Eşik Değerler)
    // Bu değerleri kafadan verdim, projene göre ayarla
    const LIMIT_ELEKTRIK = 15000; 
    const LIMIT_SU = 800;
    const LIMIT_GAZ = 5000;

    const incidentsCreated = [];

    // Fonksiyon: Arıza varsa kaydet
    const checkAndCreateIncident = async (kaynakAdi, deger, limit) => {
      if (deger > limit) {
        // Zaten aktif bir arıza var mı bak?
        const existing = await Incident.findOne({
          Mahalle,
          Kaynak_Tipi: kaynakAdi,
          Durum: 'AKTIF'
        });

        if (!existing) {
          const inc = await Incident.create({
            Mahalle,
            Kaynak_Tipi: kaynakAdi,
            Aciklama: `Otomatik Tespit: ${kaynakAdi} tüketimi sınırda! (${deger})`,
            Baslangic_Tarihi: newReading.Tarih
          });
          incidentsCreated.push(inc);
          console.log(`⚠️ ALARM: ${Mahalle} - ${kaynakAdi} Arızası Oluştu!`);
        }
      }
    };

    // 3 Kaynak için de kontrol et
    await checkAndCreateIncident('Elektrik', Elektrik_Tuketim, LIMIT_ELEKTRIK);
    await checkAndCreateIncident('Su', Su_Tuketim, LIMIT_SU);
    await checkAndCreateIncident('Dogalgaz', Dogalgaz_Tuketim, LIMIT_GAZ);

    res.status(201).json({
      message: 'Veri işlendi',
      data: newReading,
      newIncidents: incidentsCreated
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};