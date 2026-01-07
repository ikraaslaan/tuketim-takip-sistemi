const jwt = require('jsonwebtoken');

// Token Kontrol Fonksiyonu
const protect = (req, res, next) => {
  let token;

  // Header'da "Authorization: Bearer <token>" var mı?
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // "Bearer " kısmını at, sadece kodu al
      token = req.headers.authorization.split(' ')[1];

      // Token geçerli mi diye kontrol et (Gizli anahtarla çöz)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Çözülen veriyi isteğe ekle (req.user.id olarak erişilebilir)
      req.user = decoded;

      next(); // Sorun yok, geçebilirsin
    } catch (error) {
      res.status(401).json({ message: 'Yetkisiz erişim! Token geçersiz.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Yetkisiz erişim! Token bulunamadı.' });
  }
};

module.exports = { protect };