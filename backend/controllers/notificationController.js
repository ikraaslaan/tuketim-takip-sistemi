const Incident = require('../models/Incident');
const Subscriber = require('../models/Subscriber');
const emailService = require('../services/emailService');

// GET /api/notifications/unread
// Son 10 dakikada oluşturulmuş arızaları getirir
exports.getUnreadNotifications = async (req, res) => {
  try {
    // Şu andan 10 dakika öncesini hesapla
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentIncidents = await Incident.find({
      createdAt: { $gte: tenMinutesAgo }, // 10 dk önce veya daha yeni
      Durum: 'AKTIF'
    });

    res.status(200).json({
      success: true,
      count: recentIncidents.length,
      data: recentIncidents
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/notifications/notify-neighborhood
 * Notify all subscribers in a specific neighborhood about a reported issue
 * Uses Subscriber model (NOT User model)
 */
exports.notifyNeighborhoodUsers = async (req, res) => {
  try {
    // DEBUG: Log the incoming request
    console.log('📥 Request body:', req.body);
    
    const { mahalle, kaynak, mesaj, neighborhood } = req.body;

    // Handle input whether it comes as 'mahalle' or 'neighborhood'
    const targetMahalle = (mahalle || neighborhood || '').trim();

    // Validation
    if (!targetMahalle || !kaynak) {
      return res.status(400).json({
        success: false,
        message: 'Mahalle ve kaynak bilgisi zorunludur.'
      });
    }

    console.log('🔍 Aranan mahalle/neighborhood:', targetMahalle);
    console.log('🔍 Kaynak:', kaynak);

    // Use Regex for flexible matching (case-insensitive)
    // Query Subscriber model, NOT User model
    const neighborhoodRegex = new RegExp(`^${targetMahalle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    
    const recipients = await Subscriber.find({ 
      neighborhood: neighborhoodRegex 
    }).select('email name surname neighborhood');

    // DEBUG: Log search results
    console.log('🔍 Bulunan abone sayısı:', recipients.length);
    
    if (recipients.length > 0) {
      console.log('✅ Aboneler bulundu:');
      recipients.forEach((subscriber, index) => {
        console.log(`  ${index + 1}. ${subscriber.name} ${subscriber.surname} - ${subscriber.email} - neighborhood: ${subscriber.neighborhood}`);
      });
    } else {
      console.log(`❌ No subscribers found with neighborhood: ${targetMahalle}`);
      
      // Additional debug: Check if ANY subscribers exist in the database
      const totalSubscribers = await Subscriber.countDocuments();
      console.log('🔍 Toplam abone sayısı:', totalSubscribers);
      
      // Try to find all neighborhoods in the database (for debugging)
      try {
        const allNeighborhoods = await Subscriber.distinct('neighborhood');
        console.log('🔍 Veritabanındaki tüm neighborhood değerleri:', allNeighborhoods);
      } catch (err) {
        console.log('🔍 "neighborhood" alanı sorgulanamadı:', err.message);
      }
    }

    // Validation: If no subscribers found, return early
    if (!recipients || recipients.length === 0) {
      return res.status(200).json({
        success: true,
        message: `${targetMahalle} mahallesinde kayıtlı abone bulunamadı.`,
        notifiedCount: 0,
        debug: {
          searchedFor: targetMahalle,
          totalSubscribersInDB: await Subscriber.countDocuments()
        }
      });
    }

    // Prepare email details
    const reportDate = new Date().toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const customMessage = mesaj || `${targetMahalle} mahallesinde ${kaynak} arızası bildirilmiştir. Ekiplerimiz haberdardır.`;

    // Send email to each subscriber
    let successCount = 0;
    let failCount = 0;
    const emailPromises = recipients.map(async (subscriber) => {
      try {
        // Use nodemailer to send email directly
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

        const fullName = `${subscriber.name} ${subscriber.surname}`;

        const mailOptions = {
          from: `"Kentsel Tüketim Analizi" <${USER_EMAIL}>`,
          to: subscriber.email,
          subject: `⚠️ Arıza Bildirimi: ${targetMahalle} - ${kaynak}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #dc2626; border-radius: 8px; background-color: #fffafa;">
              <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Arıza Bildirimi</h2>
              
              <p>Sayın <strong>${fullName}</strong>,</p>
              
              <div style="background-color: #fee2e2; padding: 20px; border-radius: 4px; border: 1px solid #fecaca; margin: 20px 0;">
                <p style="margin: 8px 0;"><strong>📍 Mahalle:</strong> ${targetMahalle}</p>
                <p style="margin: 8px 0;"><strong>⚡ Kaynak Tipi:</strong> ${kaynak}</p>
                <p style="margin: 8px 0;"><strong>📅 Tarih:</strong> ${reportDate}</p>
              </div>
              
              <div style="background-color: #fff; padding: 15px; border-radius: 4px; border: 1px solid #fecaca; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">📝 Bildirim:</p>
                <p style="margin: 10px 0 0 0; color: #374151;">
                  ${customMessage}
                </p>
              </div>
              
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Bu bildirim sistem tarafından otomatik olarak oluşturulmuştur. Sorununuzla ilgili ek bilgi için lütfen destek ekibimizle iletişime geçiniz.
              </p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ E-posta gönderildi: ${subscriber.email} (${fullName})`);
        successCount++;
      } catch (emailError) {
        console.error(`❌ E-posta gönderme hatası (${subscriber.email}):`, emailError.message);
        failCount++;
      }
    });

    // Wait for all emails to be sent
    await Promise.allSettled(emailPromises);

    res.status(200).json({
      success: true,
      message: `${targetMahalle} mahallesindeki ${successCount} aboneye bilgilendirme e-postası gönderildi.`,
      notifiedCount: successCount,
      failedCount: failCount,
      totalSubscribers: recipients.length
    });

  } catch (error) {
    console.error('❌ Mahalle bildirimi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılara bildirim gönderilirken bir hata oluştu.',
      error: error.message
    });
  }
};