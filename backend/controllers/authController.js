const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendVerificationEmail } = require('../services/mailService');


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
        
        await sendVerificationEmail(user.email, user.verificationToken);

                res.status(201).json({ 
                message: "Kayıt başarılı. Doğrulama maili gönderildi. Terminaldeki linkten maili kontrol edebilirsiniz." 
                    });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
 exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kullanıcı var mı?
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });

        // 2. Mail doğrulanmış mı?
        if (!user.isVerified) return res.status(401).json({ message: "Lütfen önce mailinizi doğrulayın!" });

        // 3. Şifre doğru mu?
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Geçersiz şifre!" });

        // 4. Token Üret (JWT)
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'gizli_anahtar',
            { expiresIn: '24h' }
        );

        res.json({
            message: "Giriş başarılı",
            token,
            user: { name: user.name, role: user.role }
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