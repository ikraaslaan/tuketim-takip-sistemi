const Subscriber = require('../models/Subscriber');
const Incident = require('../models/Incident'); // Bildirim için gerekli

// 1. Abone Olma
exports.subscribe = async (req, res) => {
  try {
    const { name, surname, email, neighborhood } = req.body;
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Bu e-posta adresi zaten kayıtlı." });
    }

    const newSubscriber = await Subscriber.create({
      name, surname, email, neighborhood
    });

    res.status(201).json({ success: true, message: "Abonelik başarıyla oluşturuldu!", data: newSubscriber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Get Subscriber by Email (for user dashboard)
exports.getSubscriberByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'E-posta adresi gereklidir.' });
    }

    const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Abone bulunamadı.' });
    }

    res.status(200).json({ 
      success: true, 
      data: {
        email: subscriber.email,
        neighborhood: subscriber.neighborhood,
        name: subscriber.name,
        surname: subscriber.surname
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Bildirim Gönderme (IncidentController'dan çağrılır)
exports.notifySubscribers = async (incident) => {
  try {
    const subscribers = await Subscriber.find({ neighborhood: incident.Mahalle });

    if (subscribers.length === 0) {
      console.log(`📭 ${incident.Mahalle} mahallesinde abone yok. Bildirim gönderilmedi.`);
      return;
    }

    console.log(`📢 BİLDİRİM BAŞLATILIYOR: ${incident.Mahalle} - ${incident.Kaynak_Tipi} Kesintisi`);
    subscribers.forEach(sub => {
      console.log(`   📧 Gönderiliyor -> Kime: ${sub.email} | Konu: ${incident.Mahalle} Kesintisi | Mesaj: Sayın ${sub.name}, mahallenizde ${incident.Kaynak_Tipi} kesintisi tespit edilmiştir.`);
    });
    console.log(`✅ Toplam ${subscribers.length} aboneye bildirim simüle edildi.`);

  } catch (error) {
    console.error("Bildirim hatası:", error);
  }
};