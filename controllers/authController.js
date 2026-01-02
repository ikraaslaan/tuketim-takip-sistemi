const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { name, surname, neighborhood, email, password, role } = req.body;

        // 1. Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Bu email zaten kayıtlı!" });

        // 2. Yeni kullanıcı oluştur (isVerified default false)
        const user = new User({
            name, surname, neighborhood, email, password, role,
            verificationToken: "simulasyon_token_123" // Gerçekte rastgele üretilir
        });

        await user.save();
        
        // 3. Mail doğrulama simülasyonu
        console.log(`📧 Doğrulama maili gönderildi: ${email}`);
        
        res.status(201).json({ 
            message: "Kayıt başarılı. Lütfen mail adresinizi doğrulayın (Simülasyon: /verify endpointini kullanın)." 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOneAndUpdate({ email }, { isVerified: true, verificationToken: null });
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        
        res.json({ message: "Email başarıyla doğrulandı. Artık giriş yapabilirsiniz." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};