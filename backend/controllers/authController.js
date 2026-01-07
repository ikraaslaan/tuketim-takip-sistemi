const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Token Üretici Yardımcı Fonksiyon
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d' // Token 30 gün geçerli olsun
  });
};

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kullanıcıyı bul
    const user = await User.findOne({ username });

    // Kullanıcı var mı VE Şifre eşleşiyor mu?
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        success: true,
        _id: user.id,
        username: user.username,
        role: user.role,
        mahalle: user.mahalle, // Include neighborhood for user dashboard
        token: generateToken(user._id) // <--- İşte giriş anahtarı bu!
      });
    } else {
      res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};