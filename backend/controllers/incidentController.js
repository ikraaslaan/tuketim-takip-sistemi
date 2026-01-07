const Incident = require('../models/Incident');
const LiveTuketim = require('../models/LiveTuketim'); // Yeni eklediğimiz model
const ActiveAlarm = require('../models/ActiveAlarm'); 
const Subscriber = require('../models/Subscriber'); // For email notifications 

// Arıza Listesi
exports.getIncidents = async (req, res) => {
  try {
    // Önce zamanı gelmiş planlı kesintileri aktifleştir
    const now = new Date();
    // Use regex to match ANY case variation (Pasif, PASIF, pasif, etc.)
    await Incident.updateMany(
      { 
        Tip: 'PLANLI',
        Baslangic_Tarihi: { $lte: now },
        Durum: { $regex: /^pasif$/i }  // Case-insensitive match
      },
      { $set: { Durum: 'AKTIF' } }  // FORCE UPPERCASE
    );

    // Check if query parameter requests only planned outages
    const { type, status } = req.query;
    
    let query = {};
    
    // If type=PLANLI is requested, filter by Tip
    if (type === 'PLANLI') {
      query.Tip = 'PLANLI';
    }
    
    // ROBUST FETCH: Use regex to match ANY case variation (Aktif, AKTIF, aktif, etc.)
    if (status) {
      const statusUpper = status.toUpperCase();
      if (statusUpper === 'AKTIF') {
        // Use regex to match any case variation, but standardize to uppercase
        query.Durum = { $regex: /^aktif$/i };  // Case-insensitive match
      } else if (statusUpper === 'PASIF') {
        query.Durum = { $regex: /^pasif$/i };  // Case-insensitive match
      } else {
        // Fallback: try to match the exact value
        query.Durum = status;
      }
    }
    
    // Get incidents with optional filters
    const incidents = await Incident.find(query).sort({ Tarih: -1 });
    
    // Standardize Durum values to uppercase before returning
    const standardizedIncidents = incidents.map(inc => {
      const incidentObj = inc.toObject();
      if (incidentObj.Durum) {
        incidentObj.Durum = incidentObj.Durum.toUpperCase();
      }
      return incidentObj;
    });
    
    res.status(200).json({ success: true, data: standardizedIncidents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Planlı Kesinti Oluşturma
exports.createPlannedOutage = async (req, res) => {
  try {
    // CRITICAL: Use EXACT Turkish field names from database schema
    const { 
      Mahalle,              // Turkish: Mahalle
      Kaynak_Tipi,          // Turkish: Kaynak_Tipi
      Aciklama,             // Turkish: Aciklama
      Tahmini_Sure,         // Optional: Tahmini_Sure
      Baslangic_Tarihi,     // Turkish: Baslangic_Tarihi (not Baslangic_Zamani)
      Bitis_Tarihi,         // Turkish: Bitis_Tarihi
      Tip,                  // Turkish: Tip (from frontend, should be 'PLANLI')
      Durum                 // Turkish: Durum (from frontend, should be 'Aktif')
    } = req.body;

    // Parse dates using Turkish field names
    const start = Baslangic_Tarihi ? new Date(Baslangic_Tarihi) : new Date();
    const end = Bitis_Tarihi ? new Date(Bitis_Tarihi) : null;
    const now = new Date();
    
    // STANDARDIZE to UPPERCASE: Force Durum to be 'AKTIF' or 'PASIF'
    let durum = Durum || (start > now ? 'PASIF' : 'AKTIF');
    // Normalize to uppercase regardless of input
    durum = durum.toUpperCase();
    if (durum !== 'AKTIF' && durum !== 'PASIF') {
      durum = start > now ? 'PASIF' : 'AKTIF';  // Default based on time
    }

    // ==========================================
    // TASK 1: PREVENT DUPLICATES
    // ==========================================
    // Check if an ACTIVE incident already exists for the same Mahalle and Kaynak_Tipi
    const existingIncident = await Incident.findOne({
      Mahalle: Mahalle,
      Kaynak_Tipi: Kaynak_Tipi,
      Tip: 'PLANLI',  // Only check planned outages
      Durum: { $regex: /^AKTIF$/i }  // Case-insensitive match for active status
    });

    if (existingIncident) {
      return res.status(400).json({ 
        success: false, 
        message: `${Mahalle} mahallesinde zaten aktif bir ${Kaynak_Tipi} planlı kesintisi mevcut! Lütfen önce mevcut kesintiyi tamamlandı olarak işaretleyin.` 
      });
    }

    // CRITICAL: Use EXACT Turkish field names matching database schema
    // FORCE UPPERCASE for Durum to standardize database
    const newIncident = new Incident({
      Mahalle,                                    // Turkish: Mahalle
      Kaynak_Tipi,                                // Turkish: Kaynak_Tipi
      Tip: (Tip || 'PLANLI').toUpperCase(),       // Standardize to uppercase
      Aciklama,                                   // Turkish: Aciklama
      Tahmini_Sure: Tahmini_Sure || null,        // Optional: Tahmini_Sure
      Durum: 'AKTIF',                            // TASK 3: FORCE UPPERCASE 'AKTIF' for clean creation (matches fetch logic)
      Baslangic_Tarihi: start,                    // Turkish: Baslangic_Tarihi
      Bitis_Tarihi: end || null,                  // Turkish: Bitis_Tarihi
      Tarih: now                                  // Created timestamp
    });

    await newIncident.save();

    // ==========================================
    // EMAIL NOTIFICATION: Notify Subscribers
    // ==========================================
    try {
      const targetMahalle = (Mahalle || '').trim();
      
      if (targetMahalle) {
        // Use Regex for flexible matching (case-insensitive)
        const neighborhoodRegex = new RegExp(`^${targetMahalle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        
        // Query Subscriber model for this neighborhood
        // Use case-insensitive regex to match neighborhood names (robust matching)
        const recipients = await Subscriber.find({ 
          $or: [
            { neighborhood: neighborhoodRegex },
            { mahalle: neighborhoodRegex },
            { neighborhood: new RegExp(targetMahalle, 'i') },  // Additional fallback
            { mahalle: new RegExp(targetMahalle, 'i') }         // Additional fallback
          ]
        }).select('email name surname neighborhood mahalle');

        console.log(`📧 Planlı kesinti bildirimi: ${recipients.length} abone bulundu (${targetMahalle})`);
        console.log(`📧 Abone detayları:`, recipients.map(r => ({ 
          email: r.email, 
          name: r.name, 
          neighborhood: r.neighborhood || r.mahalle 
        })));
        
        // CRITICAL: Log if no subscribers found
        if (recipients.length === 0) {
          console.log(`⚠️ UYARI: ${targetMahalle} mahallesinde kayıtlı abone bulunamadı. Email gönderilmeyecek.`);
        }

        if (recipients.length > 0) {
          // Format dates for email
          const baslangicStr = start.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // CRITICAL FIX: Use 'end' variable (not 'endTime' which doesn't exist)
          const bitisStr = end ? end.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Belirtilmemiş';

          // Email configuration
          const nodemailer = require('nodemailer');
          const USER_EMAIL = '23frontend23@gmail.com';
          const APP_PASSWORD = 'lqobohztvxyhqnkt';

          const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: USER_EMAIL,
              pass: APP_PASSWORD,
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
          });

          // Send email to each subscriber
          let successCount = 0;
          let failCount = 0;
          
          const emailPromises = recipients.map(async (subscriber) => {
            try {
              const fullName = `${subscriber.name} ${subscriber.surname}`;

              const mailOptions = {
                from: `"Kentsel Tüketim Analizi" <${USER_EMAIL}>`,
                to: subscriber.email,
                subject: `⚠️ Planlı Kesinti Bilgilendirmesi: ${targetMahalle} - ${Kaynak_Tipi}`,
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #f59e0b; border-radius: 8px; background-color: #fffbeb;">
                    <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Planlı Kesinti Bilgilendirmesi</h2>
                    
                    <p>Sayın <strong>${fullName}</strong>,</p>
                    
                    <div style="background-color: #fef3c7; padding: 20px; border-radius: 4px; border: 1px solid #fde68a; margin: 20px 0;">
                      <p style="margin: 8px 0;"><strong>📍 Mahalle:</strong> ${targetMahalle}</p>
                      <p style="margin: 8px 0;"><strong>⚡ Kaynak Tipi:</strong> ${Kaynak_Tipi}</p>
                      <p style="margin: 8px 0;"><strong>🕒 Başlangıç:</strong> ${baslangicStr}</p>
                      <p style="margin: 8px 0;"><strong>🕒 Bitiş:</strong> ${bitisStr}</p>
                      ${Tahmini_Sure ? `<p style="margin: 8px 0;"><strong>⏱️ Tahmini Süre:</strong> ${Tahmini_Sure} saat</p>` : ''}
                    </div>
                    
                    <div style="background-color: #fff; padding: 15px; border-radius: 4px; border: 1px solid #fde68a; margin: 20px 0;">
                      <p style="margin: 0; font-weight: bold; color: #92400e;">📝 Açıklama:</p>
                      <p style="margin: 10px 0 0 0; color: #374151;">
                        ${Aciklama || `${targetMahalle} mahallesinde ${baslangicStr} - ${bitisStr} saatleri arasında planlı bakım çalışması yapılacaktır.`}
                      </p>
                    </div>
                    
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">
                      Bu bildirim sistem tarafından otomatik olarak oluşturulmuştur. Planlı kesinti süresince hizmetlerimiz geçici olarak kesilecektir.
                    </p>
                  </div>
                `
              };

              await transporter.sendMail(mailOptions);
              console.log(`✅ Planlı kesinti e-postası gönderildi: ${subscriber.email} (${fullName})`);
              successCount++;
            } catch (emailError) {
              console.error(`❌ E-posta gönderme hatası (${subscriber.email}):`, emailError.message);
              failCount++;
            }
          });

          // Wait for all emails to be sent (non-blocking)
          await Promise.allSettled(emailPromises);
          
          // CRITICAL: Log email sending results
          console.log(`📧 Planlı kesinti bildirimi tamamlandı: ${successCount} başarılı, ${failCount} başarısız`);
          console.log(`📧 Mail sent to: ${successCount} users`);
          
          if (successCount > 0) {
            console.log(`✅ Email bildirimleri başarıyla gönderildi (${successCount} abone)`);
          }
          if (failCount > 0) {
            console.error(`❌ ${failCount} email gönderilemedi`);
          }
        } else {
          console.log(`ℹ️ ${targetMahalle} mahallesinde kayıtlı abone bulunamadı. Email gönderilmeyecek.`);
        }
      }
    } catch (emailError) {
      // Don't fail the request if email fails, just log it
      console.error('❌ Planlı kesinti e-posta bildirimi hatası:', emailError.message);
    }

    res.status(201).json({ 
      success: true, 
      data: newIncident,
      message: 'Planlı kesinti başarıyla oluşturuldu ve abonelere bildirim gönderildi.'
    });
  } catch (error) {
    console.error('❌ Planlı kesinti oluşturma hatası:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Anlık Arıza Oluşturma
exports.createInstantIncident = async (req, res) => {
  try {
    const { Mahalle, Kaynak_Tipi, Aciklama } = req.body;

    // Mükerrer Kayıt Kontrolü (Aynı mahallede, aynı kaynakta aktif arıza var mı?)
    // Only check for faults (Tip: 'ARIZA'), not planned outages
    const existing = await Incident.findOne({
      Mahalle,
      Kaynak_Tipi,
      Tip: 'ARIZA',  // Only check faults
      Durum: 'AKTIF'  // Normalize to uppercase
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: `HATA: ${Mahalle} mahallesinde zaten aktif bir ${Kaynak_Tipi} arızası mevcut!` 
      });
    }

    // CRITICAL: Use 'Tip' field (not 'Tur') to match schema
    // Faults use Tip: 'ARIZA' to distinguish from planned outages (PLANLI)
    const newIncident = new Incident({
      Mahalle,
      Kaynak_Tipi,
      Tip: req.body.Tip || 'ARIZA',  // Use Tip from frontend, default to 'ARIZA' for faults
      Aciklama,
      Durum: 'AKTIF',  // Normalize to uppercase
      Tarih: new Date()
    });

    await newIncident.save();
    res.status(201).json({ success: true, data: newIncident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Arıza Durum Toggle (Yönetici Onayı) - AKTIF <-> PASIF
exports.resolveIncident = async (req, res) => {
  try {
    const incidentId = req.params.id;
    
    // First check if incident exists
    const existingIncident = await Incident.findById(incidentId);
    if (!existingIncident) {
      return res.status(404).json({ success: false, message: 'Arıza bulunamadı' });
    }

    // Handle multiple possible status formats: 'AKTIF', 'Aktif', 'aktif', 'PASIF', 'Pasif', 'pasif'
    // STANDARDIZE to UPPERCASE: Normalize any case variation to uppercase
    const currentStatus = String(existingIncident.Durum || '');
    const currentStatusUpper = currentStatus.toUpperCase();
    const isActive = currentStatusUpper === 'AKTIF' || currentStatusUpper === 'AKTİF';
    
    // TASK 2: FIX "ZOMBIE" BUG - FORCE UPPERCASE 'PASIF' to ensure it gets filtered out
    // When resolving, set Durum to 'PASIF' (uppercase) so fetch queries filter it out
    const updateData = {
      Durum: isActive ? 'PASIF' : 'AKTIF'  // FORCE UPPERCASE: 'PASIF' or 'AKTIF'
    };
    
    // Update Bitis_Tarihi only when resolving (AKTIF -> PASIF)
    if (isActive) {
      updateData.Bitis_Tarihi = new Date();
      console.log(`✅ Planlı kesinti tamamlandı: ${incidentId} - ${existingIncident.Mahalle} (Durum: PASIF - Artık listede görünmeyecek)`);
    } else {
      // When reactivating, clear Bitis_Tarihi
      updateData.Bitis_Tarihi = null;
      console.log(`🔄 Planlı kesinti tekrar aktif: ${incidentId} - ${existingIncident.Mahalle} (Durum: AKTIF)`);
    }
    
    // CRITICAL: Use findByIdAndUpdate with EXACT Turkish field names
    // FORCE UPPERCASE update to standardize database and prevent "zombie" records
    const updatedIncident = await Incident.findByIdAndUpdate(
      incidentId,
      { 
        $set: {
          Durum: updateData.Durum,              // FORCE UPPERCASE: 'PASIF' ensures it's filtered out
          Bitis_Tarihi: updateData.Bitis_Tarihi // Turkish: Bitis_Tarihi
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedIncident) {
      return res.status(404).json({ success: false, message: 'Arıza güncellenemedi' });
    }

    // Verify the update was successful
    console.log(`✅ Güncellenmiş incident:`, {
      id: updatedIncident._id,
      Durum: updatedIncident.Durum,
      Bitis_Tarihi: updatedIncident.Bitis_Tarihi
    });

    res.status(200).json({ 
      success: true, 
      data: updatedIncident,
      message: `Planlı kesinti ${isActive ? 'tamamlandı (Durum: Pasif)' : 'tekrar aktif (Durum: Aktif)'} olarak işaretlendi`
    });
  } catch (error) {
    console.error('❌ Arıza durum güncelleme hatası:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SİSTEM ALARMLARINI GETİR (Bildirim Çubuğu İçin)
// =========================================================================
exports.getSystemAlerts = async (req, res) => {
    try {
        console.log("🔍 Alarm kontrolü yapılıyor..."); 

        // Veritabanındaki 'aktif_alarmlar' tablosundaki her şeyi çek
        const alerts = await ActiveAlarm.find().sort({ _id: -1 });

        console.log(`✅ Bulunan Alarm Sayısı: ${alerts.length}`);
        
        if (alerts.length === 0) {
            return res.status(200).json({ success: true, alerts: [] });
        }

        res.status(200).json({ success: true, alerts: alerts });

    } catch (error) {
        console.error("Alarm Çekme Hatası:", error);
        res.status(500).json({ success: false, message: "Alarmlar alınamadı." });
    }
};

// =========================================================================
// YENİ: CANLI VERİ TABLOSUNDAN SON KAYDI ÇEK (tuketim_kayitlari)
// =========================================================================
exports.getLiveDashboardData = async (req, res) => {
    try {
        // 1. Veritabanındaki tüm mahalle isimlerini bul
        const neighborhoods = await LiveTuketim.distinct("Mahalle");
        
        const liveData = [];

        for (const mahalleIsmi of neighborhoods) {
            // 2. Her mahalle için EN SON eklenen kaydı (Tarih veya ID'ye göre) çek
            const latestRecord = await LiveTuketim.findOne({ Mahalle: mahalleIsmi })
                                                  .sort({ _id: -1 }); // En yeni kayıt en üstte

            if (latestRecord) {
                // Frontend'in beklediği formata çeviriyoruz
                // (Frontend 'ortalama' bekliyor, biz ona gerçek 'tuketim' değerini veriyoruz)
                liveData.push({
                    mahalle: latestRecord.Mahalle,
                    elektrik: { ortalama: latestRecord.Elektrik_Tuketim }, 
                    su: { ortalama: latestRecord.Su_Tuketim },
                    dogalgaz: { ortalama: latestRecord.Dogalgaz_Tuketim }
                });
            }
        }

        res.status(200).json({ success: true, data: liveData });

    } catch (error) {
        console.error("Canlı Veri Hatası:", error);
        res.status(500).json({ success: false, message: "Canlı veriler alınamadı" });
    }
};