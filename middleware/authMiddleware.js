const jwt = require('jsonwebtoken');

// 1. Kalkan: Token Geçerli mi?
const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
            req.user = decoded; // Token içindeki ID ve Rol bilgisini isteğe ekle
            next();
        } catch (error) {
            return res.status(401).json({ message: "Yetkisiz erişim, token hatalı!" });
        }
    }
    if (!token) {
        return res.status(401).json({ message: "Yetki yok, token bulunamadı!" });
    }
};

// 2. Kalkan: Sadece Adminler Girebilir mi?
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Bu işlem için yetkiniz yok. Sadece Adminler erişebilir." });
    }
};

module.exports = { protect, adminOnly };