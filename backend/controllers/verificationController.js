const Subscriber = require('../models/Subscriber');
const { sendVerificationEmail } = require('../services/mailService');

// 6 haneli rastgele kod üret
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Subscriber için doğrulama başlat
exports.initiateSubscriberVerification = async (req, res) => {
    try {
        const { name, surname, email, neighborhood } = req.body;

        if (!name || !surname || !email || !neighborhood) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tüm alanlar zorunludur' 
            });
        }

        // Email format kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Geçerli bir email adresi giriniz' 
            });
        }

        // Mevcut subscriber kontrolü
        let subscriber = await Subscriber.findOne({ email });
        
        const verificationCode = generateVerificationCode();
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 10); // 10 dakika geçerli

        if (subscriber) {
            // Mevcut subscriber varsa güncelle
            subscriber.name = name;
            subscriber.surname = surname;
            subscriber.neighborhood = neighborhood;
            subscriber.verificationCode = verificationCode;
            subscriber.verificationCodeExpiry = expiryDate;
            subscriber.isVerified = false;
            await subscriber.save();
        } else {
            // Yeni subscriber oluştur
            subscriber = new Subscriber({
                name,
                surname,
                email,
                neighborhood,
                verificationCode,
                verificationCodeExpiry: expiryDate
            });
            await subscriber.save();
        }

        // Email gönder
        let emailSent = false;
        let emailPreviewUrl = null;
        try {
            const emailResult = await sendVerificationEmail(email, verificationCode);
            emailSent = true;
            if (emailResult && emailResult.previewUrl) {
                emailPreviewUrl = emailResult.previewUrl;
            }
        } catch (emailError) {
            console.error('Email gönderme hatası:', emailError);
            // Email gönderilemese bile devam et (test ortamında)
        }

        // Test ortamında kodu response'a da ekle (kullanıcı görebilsin)
        res.json({ 
            success: true, 
            message: emailSent 
                ? 'Doğrulama kodu oluşturuldu. Test ortamında konsola yazdırıldı - Backend loglarına bakın!' 
                : 'Doğrulama kodu oluşturuldu (Email gönderilemedi, konsola bakın)',
            email: email,
            verificationCode: verificationCode, // Test için kodu da döndür
            emailPreviewUrl: emailPreviewUrl // Ethereal preview URL'i
        });
    } catch (error) {
        console.error('Doğrulama başlatma hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Doğrulama başlatılamadı' 
        });
    }
};

// Subscriber için doğrulama kodu kontrol et
exports.verifySubscriberCode = async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email ve kod zorunludur' 
            });
        }

        const subscriber = await Subscriber.findOne({ email });

        if (!subscriber) {
            return res.status(404).json({ 
                success: false, 
                message: 'Email bulunamadı' 
            });
        }

        // Kod kontrolü
        if (subscriber.verificationCode !== code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Geçersiz doğrulama kodu' 
            });
        }

        // Süre kontrolü
        if (new Date() > subscriber.verificationCodeExpiry) {
            return res.status(400).json({ 
                success: false, 
                message: 'Doğrulama kodu süresi dolmuş. Lütfen yeni kod isteyin.' 
            });
        }

        // Doğrula
        subscriber.isVerified = true;
        subscriber.verificationCode = null;
        subscriber.verificationCodeExpiry = null;
        await subscriber.save();

        res.json({ 
            success: true, 
            message: 'Email başarıyla doğrulandı',
            subscriberData: {
                name: subscriber.name,
                surname: subscriber.surname,
                email: subscriber.email,
                neighborhood: subscriber.neighborhood
            }
        });
    } catch (error) {
        console.error('Doğrulama hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Doğrulama başarısız' 
        });
    }
};

// Subscriber için doğrulama kodu yeniden gönder
exports.resendSubscriberCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email zorunludur' 
            });
        }

        const subscriber = await Subscriber.findOne({ email });

        if (!subscriber) {
            return res.status(404).json({ 
                success: false, 
                message: 'Email bulunamadı' 
            });
        }

        const verificationCode = generateVerificationCode();
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 10);

        subscriber.verificationCode = verificationCode;
        subscriber.verificationCodeExpiry = expiryDate;
        await subscriber.save();

        // Email gönder
        try {
            await sendVerificationEmail(email, verificationCode);
        } catch (emailError) {
            console.error('Email gönderme hatası:', emailError);
        }

        res.json({ 
            success: true, 
            message: 'Doğrulama kodu yeniden gönderildi' 
        });
    } catch (error) {
        console.error('Kod yeniden gönderme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Kod gönderilemedi' 
        });
    }
};
