const verificationService = require('../services/verificationService');
const emailService = require('../services/emailService');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * 1. AŞAMA: DOĞRULAMA BAŞLAT (Kayıt Formundan Gelen Veriler)
 */
exports.initiateVerification = async (req, res) => {
  try {
    // ✨ GÜNCELLEME: Frontend'den 'mahalle' bilgisini de istiyoruz
    const { username, password, email, mahalle } = req.body;

    // Hepsini kontrol et
    if (!username || !password || !email || !mahalle) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, şifre, e-posta ve mahalle bilgisi zorunludur.'
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir e-posta adresi giriniz.' });
    }

    // Kullanıcı adı var mı?
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }

    // Email var mı?
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    // ✨ GÜNCELLEME: Mahalleyi de kodla birlikte geçici hafızaya alıyoruz
    // Kullanıcı kodu doğrulayana kadar bu bilgiler RAM'de veya Redis'te duracak
    const code = await verificationService.generateAndStoreCode(email, {
      username,
      password,
      email,
      mahalle // <-- BURASI ÇOK ÖNEMLİ
    });

    // Doğrulama mailini gönder
    await emailService.sendVerificationCode(email, code);

    res.status(200).json({
      success: true,
      message: 'Doğrulama kodu e-posta adresinize gönderildi.',
      email: email
    });

  } catch (error) {
    console.error('Doğrulama başlatma hatası:', error);
    res.status(500).json({ success: false, message: 'Kod gönderilirken hata oluştu.' });
  }
};

/**
 * 2. AŞAMA: KODU DOĞRULA VE KAYDET
 */
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'E-posta ve kod gereklidir.' });
    }

    // Kodu servise sor: Doğru mu?
    const validation = await verificationService.validateCode(email, code);

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error || 'Geçersiz kod.' });
    }

    // ✨ GÜNCELLEME: Saklanan veriden mahalleyi geri alıyoruz
    const { username, password, mahalle } = validation.userData;

    // Şifreyi kriptola
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✨ FİNAL: Kullanıcıyı MAHALLE bilgisiyle veritabanına kaydet
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      mahalle, // <-- Artık veritabanında!
      role: 'kullanici'
    });

    res.status(201).json({
      success: true,
      message: 'Hesabınız başarıyla oluşturuldu!',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        mahalle: user.mahalle,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ success: false, message: 'Hesap oluşturulurken hata oluştu.' });
  }
};

// Kod Tekrar Gönder (Burası aynı kalıyor)
exports.resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'E-posta adresi gereklidir.' });

    const stored = verificationService.getStoredData(email);
    if (!stored) return res.status(400).json({ message: 'Aktif kod bulunamadı, tekrar kayıt olun.' });

    await emailService.sendVerificationCode(email, stored.code);
    res.status(200).json({ success: true, message: 'Kod tekrar gönderildi.' });
  } catch (error) {
    res.status(500).json({ message: 'Hata oluştu.' });
  }
};