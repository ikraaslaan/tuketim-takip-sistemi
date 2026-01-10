const Subscriber = require('../models/Subscriber');
const { sendVerificationEmail } = require('../services/mailService');

// Subscriber kayıt
exports.createSubscriber = async (req, res) => {
    try {
        const { name, surname, email, neighborhood } = req.body;
        
        if (!name || !surname || !email || !neighborhood) {
            return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
        }

        // Email kontrolü - eğer zaten varsa ve doğrulanmışsa, güncelle
        let subscriber = await Subscriber.findOne({ email });
        if (subscriber) {
            // Zaten kayıtlı ve doğrulanmışsa, bilgileri güncelle
            subscriber.name = name;
            subscriber.surname = surname;
            subscriber.neighborhood = neighborhood;
            subscriber.isVerified = true; // Doğrulama başarılı olduğu için true yap
            await subscriber.save();
            return res.status(200).json({ success: true, message: 'Abone bilgileri güncellendi', data: subscriber });
        }

        // Yeni subscriber oluştur (zaten doğrulanmış olarak kaydet)
        subscriber = new Subscriber({
            name,
            surname,
            email,
            neighborhood,
            isVerified: true // Doğrulama başarılı olduğu için true yap
        });

        await subscriber.save();
        res.status(201).json({ success: true, message: 'Abone başarıyla kaydedildi', data: subscriber });
    } catch (error) {
        console.error('Subscriber kayıt hatası:', error);
        res.status(500).json({ message: error.message });
    }
};

// Tüm subscriber'ları listele
exports.getSubscribers = async (req, res) => {
    try {
        const subscribers = await Subscriber.find({ isVerified: true });
        res.json({ success: true, data: subscribers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
