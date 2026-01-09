const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, token) => {
    // 1. Test hesabı oluştur (Ethereal)
    // Gerçek bir proje olsa buraya Gmail/SendGrid bilgileri gelirdi
    let testAccount = await nodemailer.createTestAccount();

    // 2. Taşıyıcıyı (Transporter) yapılandır
    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
            user: testAccount.user, 
            pass: testAccount.pass, 
        },
    });

    // 3. Mail içeriğini hazırla
    const url = `http://localhost:5000/api/auth/verify`; // Gerçekte bir link olur
    
    let info = await transporter.sendMail({
        from: '"Mahalle Yönetim Sistemi v2" <noreply@mahalle.com>',
        to: email,
        subject: "Hesap Doğrulama İşlemi",
        text: `Merhaba, hesabınızı doğrulamak için token kodunuz: ${token}`,
        html: `
            <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #4CAF50;">Mahalle Yönetim Sistemi'ne Hoş Geldiniz!</h2>
                <p>Hesabınızı aktif etmek için aşağıdaki kodu doğrulama ekranına giriniz:</p>
                <div style="background: #f4f4f4; padding: 10px; font-weight: bold; font-size: 1.2em;">
                    ${token}
                </div>
                <p>Veya doğrudan bu adrese isteği atın: <b>${url}</b></p>
            </div>
        `,
    });

    // 4. Test mesajının linkini konsola bas (Hoca buraya bayılacak!)
    console.log("-----------------------------------------");
    console.log("📧 Mail Gönderildi: %s", info.messageId);
    console.log("🔗 Maili Görüntüle: %s", nodemailer.getTestMessageUrl(info));
    console.log("-----------------------------------------");
};

module.exports = { sendVerificationEmail };